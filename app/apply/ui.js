"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { COUNTRY_CODES, flagOf } from "@/lib/countries";

// Native <input type="checkbox"> ile, aynı tık içinde preventDefault + state ile "checked"
// değerini değiştirmek DOM'da güvenilir şekilde senkronize olmuyor; bu yüzden buton tabanlı
// özel bir kutucuk kullanıyoruz.
function NoticeCheckbox({ checked, onClick }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onClick}
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked ? "border-fiba-600 bg-fiba-600" : "border-stone-300 bg-white"
      }`}>
      {checked && (
        <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M3 8.5L6.5 12L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function ApplyForm({ labels, lang }) {
  const [f, setF] = useState({ fullName: "", email: "", country: "", company: "" });
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  // Her belge kendi { opened, checked } durumunu tutar: kutucuğa ilk tıklama sadece
  // PDF'i açar, onay (checked) ancak PDF açıldıktan sonraki tıklamada verilebilir.
  const [participant, setParticipant] = useState({ opened: false, checked: false });
  const [cookie, setCookie] = useState({ opened: false, checked: false });
  const bothChecked = participant.checked && cookie.checked;
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

  // Kutucuğa tıklama: belge henüz açılmadıysa PDF'i yeni sekmede aç ve sadece "opened"
  // işaretle (kutu henüz işaretlenmez); zaten açıldıysa asıl onay/işaretlemeyi yap.
  function handleBoxClick(setter, url) {
    return () => {
      setter((s) => {
        if (!s.opened) {
          window.open(url, "_blank", "noopener,noreferrer");
          return { opened: true, checked: false };
        }
        return { ...s, checked: !s.checked };
      });
    };
  }

  // Metindeki bağlantıya tıklama: PDF her zaman açılır (varsayılan davranış), ayrıca
  // "opened" işaretlenir ki kutucuğa sıradaki tıklama doğrudan onaylasın.
  function handleLinkClick(setter) {
    return () => setter((s) => ({ ...s, opened: true }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
    if (Object.values(clean).some((v) => !v)) return setError(labels.err);
    if (clean.fullName.length < 5 || !clean.fullName.includes(" ")) return setError(labels.nameErr);
    if (password.length < 6) return setError(labels.passErr);
    if (password !== password2) return setError(labels.passMismatch);
    if (!bothChecked) return setError(labels.noticeErr);
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
          <span className="text-xs text-stone-400">{labels.emailHint}</span>
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
      <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-2.5 text-sm text-stone-700">
            <NoticeCheckbox checked={participant.checked}
              onClick={handleBoxClick(setParticipant, "/legal/participant-privacy-notice.pdf")} />
            <span>
              {labels.noticePre}{" "}
              <a href="/legal/participant-privacy-notice.pdf" target="_blank" rel="noreferrer"
                onClick={handleLinkClick(setParticipant)}
                className="font-medium text-fiba-700 hover:underline">
                {labels.noticeParticipant}
              </a>.
            </span>
          </div>
          {participant.opened && !participant.checked && (
            <p className="pl-6 text-xs text-fiba-700">{labels.noticeConfirmHint}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-2.5 text-sm text-stone-700">
            <NoticeCheckbox checked={cookie.checked}
              onClick={handleBoxClick(setCookie, "/legal/cookie-privacy-notice.pdf")} />
            <span>
              {labels.noticePre}{" "}
              <a href="/legal/cookie-privacy-notice.pdf" target="_blank" rel="noreferrer"
                onClick={handleLinkClick(setCookie)}
                className="font-medium text-fiba-700 hover:underline">
                {labels.noticeCookie}
              </a>.
            </span>
          </div>
          {cookie.opened && !cookie.checked && (
            <p className="pl-6 text-xs text-fiba-700">{labels.noticeConfirmHint}</p>
          )}
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
