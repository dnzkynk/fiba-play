"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { COUNTRY_CODES, flagOf } from "@/lib/countries";

export function ApplyForm({ labels, lang }) {
  const [f, setF] = useState({ fullName: "", email: "", country: "", company: "" });
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [notice, setNotice] = useState(false);
  const [opened, setOpened] = useState({ participant: false, cookie: false });
  const bothOpened = opened.participant && opened.cookie;
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

  async function submit(e) {
    e.preventDefault();
    setError("");
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
    if (Object.values(clean).some((v) => !v)) return setError(labels.err);
    if (clean.fullName.length < 5 || !clean.fullName.includes(" ")) return setError(labels.nameErr);
    if (password.length < 6) return setError(labels.passErr);
    if (password !== password2) return setError(labels.passMismatch);
    if (!bothOpened) return setError(labels.noticeOpenErr);
    if (!notice) return setError(labels.noticeErr);
    clean.password = password;
    clean.noticeAck = "1";
    setState("busy");
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(clean),
    });
    if (res.ok) return setState("done");
    const data = await res.json().catch(() => ({}));
    setState("idle");
    if (res.status === 429) return setError(labels.rate);
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
            autoComplete="email" placeholder="name.surname@company.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bc">{labels.country} <span className="text-red-500">*</span></Label>
          <Select id="bc" value={f.country} onChange={set("country")} required>
            <option value="" disabled>{labels.countryPh}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{flagOf(c.code)} {c.name}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bs">{labels.company} <span className="text-red-500">*</span></Label>
        <Input id="bs" value={f.company} onChange={set("company")} required maxLength={80}
          autoComplete="organization" placeholder={labels.companyPh} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bpw">{labels.password} <span className="text-red-500">*</span></Label>
          <Input id="bpw" type="password" value={password} required minLength={6} maxLength={40}
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bpw2">{labels.passwordRepeat} <span className="text-red-500">*</span></Label>
          <Input id="bpw2" type="password" value={password2} required minLength={6} maxLength={40}
            onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" placeholder="••••••••"
            className={password2 && password !== password2 ? "border-red-300" : undefined} />
        </div>
      </div>
      <span className="-mt-2 text-xs text-stone-400">{labels.passHint}</span>
      <div className="flex flex-col gap-1.5 rounded-lg border border-stone-200 bg-stone-50 p-3.5">
        <label className={`flex items-start gap-2.5 text-sm text-stone-700 ${!bothOpened ? "opacity-60" : ""}`}>
          <input type="checkbox" className="mt-0.5 accent-fiba-600" checked={notice} disabled={!bothOpened}
            onChange={(e) => setNotice(e.target.checked)} title={!bothOpened ? labels.noticeOpenErr : undefined} />
          <span>
            {labels.noticePre}{" "}
            <a href="/legal/participant-privacy-notice.pdf" target="_blank" rel="noreferrer"
              onClick={() => setOpened((o) => ({ ...o, participant: true }))}
              className="font-medium text-fiba-700 hover:underline">
              {labels.noticeParticipant}{opened.participant && " ✓"}
            </a>
            {" "}{labels.noticeAnd}{" "}
            <a href="/legal/cookie-privacy-notice.pdf" target="_blank" rel="noreferrer"
              onClick={() => setOpened((o) => ({ ...o, cookie: true }))}
              className="font-medium text-fiba-700 hover:underline">
              {labels.noticeCookie}{opened.cookie && " ✓"}
            </a>.
          </span>
        </label>
        {!bothOpened && <p className="pl-6 text-xs text-stone-400">{labels.noticeOpenHint}</p>}
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
