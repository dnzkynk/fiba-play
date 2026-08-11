"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";

// ISO 3166-1 alpha-2 — adlar Intl.DisplayNames ile izleyenin dilinde üretilir
const COUNTRY_CODES = "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS XK YE ZA ZM ZW".split(" ");

export function ApplyForm({ labels, lang }) {
  const [f, setF] = useState({ fullName: "", email: "", phone: "", country: "", company: "" });
  const [state, setState] = useState("idle"); // idle | busy | done
  const [error, setError] = useState("");

  const countries = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([lang === "en" ? "en" : "tr"], { type: "region" });
      return COUNTRY_CODES
        .map((c) => ({ code: c, name: dn.of(c) ?? c }))
        .sort((a, b) => a.name.localeCompare(b.name, lang === "en" ? "en" : "tr"));
    } catch {
      return COUNTRY_CODES.map((c) => ({ code: c, name: c }));
    }
  }, [lang]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setPhone = (e) =>
    setF({ ...f, phone: e.target.value.replace(/[^\d+\s().-]/g, "").slice(0, 20) });

  async function submit(e) {
    e.preventDefault();
    setError("");
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
    if (Object.values(clean).some((v) => !v)) return setError(labels.err);
    if (clean.fullName.length < 5 || !clean.fullName.includes(" ")) return setError(labels.nameErr);
    if ((clean.phone.match(/\d/g) ?? []).length < 7) return setError(labels.phoneErr);
    setState("busy");
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(clean),
    });
    if (res.ok) return setState("done");
    setState("idle");
    setError(res.status === 409 ? labels.dupe : labels.err);
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <p className="text-lg font-semibold text-emerald-800">{labels.done}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-emerald-700">{labels.doneSub}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bn">{labels.fullName} <span className="text-red-500">*</span></Label>
        <Input id="bn" value={f.fullName} onChange={set("fullName")} required maxLength={100}
          autoComplete="name" autoFocus placeholder={labels.namePh} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="be">{labels.email} <span className="text-red-500">*</span></Label>
          <Input id="be" type="email" value={f.email} onChange={set("email")} required
            autoComplete="email" placeholder="ad.soyad@fiba.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bp">{labels.phone} <span className="text-red-500">*</span></Label>
          <Input id="bp" type="tel" inputMode="tel" value={f.phone} onChange={setPhone} required
            autoComplete="tel" placeholder="+90 5xx xxx xx xx" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bc">{labels.country} <span className="text-red-500">*</span></Label>
          <Select id="bc" value={f.country} onChange={set("country")} required>
            <option value="" disabled>{labels.countryPh}</option>
            {countries.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bs">{labels.company} <span className="text-red-500">*</span></Label>
          <Input id="bs" value={f.company} onChange={set("company")} required maxLength={80}
            autoComplete="organization" placeholder={labels.companyPh} />
        </div>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={state === "busy"}>
        {state === "busy" ? labels.sending : labels.submit}
      </Button>
    </form>
  );
}
