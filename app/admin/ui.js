"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TAVLA_ENABLED } from "@/lib/features";
import { COUNTRY_CODES, flagOf } from "@/lib/countries";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) router.refresh();
    else setError((await res.json()).error ?? "Giriş başarısız");
  }
  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center py-6">
      <Card className="w-full max-w-sm overflow-hidden shadow-xl">
        <div className="border-b border-fiba-950 bg-fiba-950 p-6 text-center"
          style={{
            backgroundImage:
              "repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%), linear-gradient(135deg, #0066B3 0%, #003A63 55%, #3F7D23 100%)",
            backgroundSize: "40px 40px, 100% 100%",
          }}>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg text-white backdrop-blur">🛠</div>
          <CardTitle className="text-lg text-white">Yönetim Paneli</CardTitle>
          <CardDescription className="mt-1 text-fiba-300">
            Organizasyon ekibine özel alan
          </CardDescription>
        </div>
        <CardContent className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="aem">E-posta</Label>
              <Input id="aem" type="email" value={email} required autoFocus
                placeholder="admin@fiba.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apw">Parola</Label>
              <Input id="apw" type="password" value={password} required
                onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">Giriş yap</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function AddParticipantForm() {
  const [f, setF] = useState({ fullName: "", email: "", company: "", country: "", size: "16" });
  const [games, setGames] = useState({ chess: true, tavla: false });
  const [isReserve, setIsReserve] = useState(false);
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const selected = Object.keys(games).filter((g) => games[g]);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!selected.length) return setMsg({ ok: false, text: "En az bir oyun seçin" });
    const res = await fetch("/api/admin/participants", {
      method: "POST",
      body: JSON.stringify({ ...f, games: selected, isReserve }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ ok: true, text: `Eklendi (${selected.length} oyun) — parola: ${data.password}` });
      setF({ ...f, fullName: "", email: "", company: "" });
      router.refresh();
    } else setMsg({ ok: false, text: data.error });
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Ad Soyad</Label>
          <Input className="w-44" value={f.fullName} onChange={set("fullName")} required placeholder="Ad Soyad" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>E-posta</Label>
          <Input className="w-52" type="email" value={f.email} onChange={set("email")} required placeholder="ad.soyad@sirket.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Şirket</Label>
          <Input className="w-36" value={f.company} onChange={set("company")} placeholder="Şirket" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Ülke</Label>
          <Select className="w-32" value={f.country} onChange={set("country")}>
            <option value="">—</option>
            {COUNTRY_CODES.map((c) => <option key={c} value={c}>{flagOf(c)} {c}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Oyunlar</Label>
          <div className="flex h-9 items-center gap-3 rounded-md border border-stone-300 bg-white px-3">
            {[["chess", "♟ Satranç"], ...(TAVLA_ENABLED ? [["tavla", "🎲 Tavla"]] : [])].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-stone-700">
                <input type="checkbox" className="accent-fiba-600" checked={games[key]}
                  onChange={(e) => setGames({ ...games, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Turnuva boyu</Label>
          <Select className="w-32" value={f.size} onChange={set("size")}>
            {[8, 16, 32, 64].map((s) => <option key={s} value={s}>{s} kişilik</option>)}
          </Select>
        </div>
        <label className="flex h-9 cursor-pointer items-center gap-1.5 text-sm text-stone-700">
          <input type="checkbox" className="accent-fiba-600" checked={isReserve}
            onChange={(e) => setIsReserve(e.target.checked)} />
          Yedek listesi
        </label>
        <Button type="submit">Ekle</Button>
      </div>
      {msg && (
        <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      )}
    </form>
  );
}

export function DeleteParticipantButton({ id, label = "Sil" }) {
  const router = useRouter();
  return (
    <Button variant="destructive" size="sm"
      onClick={async () => {
        if (!confirm("Katılımcı bu oyundan çıkarılsın mı?")) return;
        const res = await fetch("/api/admin/participants", {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
        if (!res.ok) alert((await res.json()).error);
        router.refresh();
      }}>
      {label}
    </Button>
  );
}

export function ImportForm() {
  const [csv, setCsv] = useState("");
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/import", { method: "POST", body: csv });
    const data = await res.json();
    if (res.ok) {
      setMsg({ ok: true, text: `${data.inserted} yeni kayıt, ${data.updated} güncelleme` });
      setCsv("");
      router.refresh();
    } else setMsg({ ok: false, text: (data.errors ?? [data.error]).join(" · ") });
  }
  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setOpen(true)}>Toplu import (CSV)</Button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <p className="mb-2 text-xs text-stone-500">
        Kolonlar: <code className="rounded bg-white px-1 py-0.5">ad_soyad, email, sirket, oyun({TAVLA_ENABLED ? "satranc/tavla" : "satranc"}), turnuva_boyu(8/16/32/64), durum(opsiyonel: yedek), ulke(opsiyonel: TR gibi ISO kod)</code>{" "}
        — Excel'den CSV olarak dışa aktarıp yükleyin veya yapıştırın. Parolalar otomatik üretilir.
      </p>
      <input type="file" accept=".csv,.txt" className="mb-2 block text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) file.text().then(setCsv);
        }} />
      <Textarea placeholder={"Ad Soyad, ad.soyad@sirket.com, Şirket, satranc, 16"}
        value={csv} onChange={(e) => setCsv(e.target.value)} />
      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" disabled={!csv.trim()}>İçe aktar</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Kapat</Button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

// Boş turnuva oluşturma: isim + boy + (opsiyonel) tur bazlı program.
export function NewTournamentForm() {
  const [name, setName] = useState("Fiba Games 2026 Satranç");
  const [size, setSize] = useState("64");
  const [open, setOpen] = useState(false);
  const [times, setTimes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const router = useRouter();

  const rounds = Math.log2(parseInt(size, 10));
  const roundLabel = (i) => {
    const kalan = rounds - i;
    return kalan === 1 ? "Final" : kalan === 2 ? "Yarı final" : kalan === 3 ? "Çeyrek final" : `${i + 1}. Tur`;
  };

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const filled = times.slice(0, rounds).filter(Boolean);
    if (filled.length && filled.length !== rounds)
      return setMsg({ ok: false, text: "Ya tüm tur saatlerini girin ya da hiçbirini (sonra da girebilirsiniz)." });
    setBusy(true);
    const res = await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name, bracketSize: parseInt(size, 10),
        roundTimes: filled.length ? times.slice(0, rounds).map((t) => new Date(t).toISOString()) : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) { setOpen(false); setTimes([]); router.push(`/admin/t/${data.id}`); }
    else setMsg({ ok: false, text: data.error });
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Yeni turnuva</Button>;

  return (
    <form onSubmit={submit} className="w-full rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Turnuva adı</Label>
          <Input className="w-72" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Kişi sayısı (boy)</Label>
          <Select className="w-32" value={size} onChange={(e) => { setSize(e.target.value); setTimes([]); }}>
            {[8, 16, 32, 64].map((s) => <option key={s} value={s}>{s} kişilik</option>)}
          </Select>
        </div>
      </div>
      <p className="mt-4 mb-1.5 text-xs font-medium text-stone-500">
        Tur saatleri (Türkiye saati) — opsiyonel, boş bırakırsanız kuradan sonra da girebilirsiniz:
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {Array.from({ length: rounds }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Label className="text-xs">{roundLabel(i)}</Label>
            <Input type="datetime-local" className="w-auto" value={times[i] ?? ""}
              onChange={(e) => setTimes(Array.from({ length: rounds }, (_, j) => (j === i ? e.target.value : times[j] ?? "")))} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Oluşturuluyor…" : "Turnuvayı oluştur"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
        {msg && <span className="text-sm text-red-600">{msg.text}</span>}
      </div>
    </form>
  );
}

// Turnuvaya kişi atama (kura öncesi): havuzdan seç + atanmışları çıkar.
export function AssignPanel({ tournamentId, pool, assigned }) {
  const [pid, setPid] = useState("");
  const [reserve, setReserve] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const router = useRouter();

  async function act(body, okMsg) {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) { if (okMsg) setMsg({ ok: true, text: okMsg }); router.refresh(); }
    else setMsg({ ok: false, text: data.error });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Katılımcı</Label>
          <Select className="w-64" value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Havuzdan seç…</option>
            {pool.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.company ? ` — ${p.company}` : ""}</option>)}
          </Select>
        </div>
        <label className="flex h-9 cursor-pointer items-center gap-1.5 text-sm text-stone-700">
          <input type="checkbox" className="accent-fiba-600" checked={reserve} onChange={(e) => setReserve(e.target.checked)} />
          Yedek olarak
        </label>
        <Button disabled={!pid || busy} onClick={() => { act({ action: "assign", participantId: pid, isReserve: reserve }); setPid(""); }}>
          Ata
        </Button>
        {msg && <span className={`pb-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
      {pool.length === 0 && (
        <p className="text-xs text-stone-400">Havuzda atanabilecek katılımcı yok — Başvurular veya Katılımcılar sekmesinden kişi ekleyin.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {assigned.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-sm">
            {p.is_reserve && <span className="text-amber-600">yedek</span>}
            {p.full_name}
            <button type="button" className="text-stone-400 hover:text-red-600"
              onClick={() => act({ action: "unassign", participantId: p.id })} title="Çıkar">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function DrawButton({ tournamentId, count }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function run() {
    if (!confirm(`${count} asil oyuncuyla kura çekilecek. Devam?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "draw" }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) router.refresh();
    else alert(data.error);
  }
  return <Button onClick={run} disabled={busy}>{busy ? "Kura çekiliyor…" : "Kurayı çek"}</Button>;
}

export function SettingsForm({ initial }) {
  const [chessTime, setChessTime] = useState(`${initial.chess_clock_limit ?? "600"}:${initial.chess_clock_increment ?? "5"}`);
  const [tavlaPoints, setTavlaPoints] = useState(initial.tavla_points ?? "3");
  const [noShow, setNoShow] = useState(initial.no_show_minutes ?? "10");
  const [nSched, setNSched] = useState((initial.notify_schedule ?? "1") === "1");
  const [nLive, setNLive] = useState((initial.notify_live ?? "1") === "1");
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    const [limit, inc] = chessTime.split(":");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      body: JSON.stringify({ chess_clock_limit: limit, chess_clock_increment: inc, tavla_points: tavlaPoints,
        no_show_minutes: noShow, notify_schedule: nSched ? 1 : 0, notify_live: nLive ? 1 : 0 }),
    });
    setMsg(res.ok ? { ok: true, text: "Kaydedildi ✓" } : { ok: false, text: (await res.json()).error });
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>⏱ Hükmen penceresi</Label>
        <Select className="w-64" value={noShow} onChange={(e) => setNoShow(e.target.value)}>
          <option value="5">5 dakika</option>
          <option value="10">10 dakika (şartname — önerilen)</option>
          <option value="15">15 dakika</option>
          <option value="30">30 dakika</option>
          <option value="60">1 saat</option>
        </Select>
        <span className="text-xs text-stone-400">Maç saatinden itibaren bu süre içinde katılmayan taraf hükmen kaybeder</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>♟ Satranç maç süresi</Label>
        <Select className="w-64" value={chessTime} onChange={(e) => setChessTime(e.target.value)}>
          <option value="180:2">3 dk + hamle başına 2 sn (Blitz)</option>
          <option value="300:3">5 dk + hamle başına 3 sn (Blitz)</option>
          <option value="600:5">10 dk + hamle başına 5 sn (Rapid — önerilen)</option>
          <option value="900:10">15 dk + hamle başına 10 sn (Rapid)</option>
          <option value="1800:20">30 dk + hamle başına 20 sn (Klasik)</option>
        </Select>
        <span className="text-xs text-stone-400">Oyuncu başına düşünme süresi + her hamlede eklenen saniye</span>
      </div>
      {TAVLA_ENABLED && (
        <div className="flex flex-col gap-1.5">
          <Label>🎲 Tavla maç uzunluğu</Label>
          <Select className="w-64" value={tavlaPoints} onChange={(e) => setTavlaPoints(e.target.value)}>
            <option value="1">Tek oyun (1 puan) — en hızlı</option>
            <option value="3">3 puanlık maç (önerilen)</option>
            <option value="5">5 puanlık maç</option>
            <option value="7">7 puanlık maç — uzun</option>
          </Select>
          <span className="text-xs text-stone-400">Bu puana ilk ulaşan maçı kazanır (mars 2 sayılır)</span>
        </div>
      )}
      <div className="flex w-full flex-col gap-2 border-t border-stone-100 pt-4">
        <Label>📧 E-posta bildirimleri</Label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-normal text-stone-700">
          <input type="checkbox" className="accent-fiba-600" checked={nSched} onChange={(e) => setNSched(e.target.checked)} />
          Kura/program belli olunca oyunculara maç saatini gönder
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-normal text-stone-700">
          <input type="checkbox" className="accent-fiba-600" checked={nLive} onChange={(e) => setNLive(e.target.checked)} />
          Maç başladığında "hemen katıl" bildirimi gönder
        </label>
        <span className="text-xs text-stone-400">E-posta ayarı (SMTP) tanımlı değilse bu bildirimler gönderilmez.</span>
      </div>
      <Button type="submit">Kaydet</Button>
      {msg && <span className={`pb-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
    </form>
  );
}

export function TournamentScheduleForm({ tournamentId, rounds, roundTimes, startsAt, intervalHours }) {
  const toLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const roundLabel = (i) => {
    const kalan = rounds - i;
    return kalan === 1 ? "Final" : kalan === 2 ? "Yarı final" : kalan === 3 ? "Çeyrek final" : `${i + 1}. Tur`;
  };
  const [times, setTimes] = useState(() =>
    Array.from({ length: rounds }, (_, i) => {
      if (roundTimes?.[i]) return toLocal(roundTimes[i]);
      if (startsAt) return toLocal(new Date(new Date(startsAt).getTime() + i * (intervalHours ?? 24) * 3600_000).toISOString());
      return "";
    })
  );
  const [msg, setMsg] = useState(null);
  const router = useRouter();

  async function apply() {
    setMsg(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "schedule",
        roundTimes: times.map((t) => new Date(t).toISOString()),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ ok: true, text: `${data.scheduled} maç programlandı` });
      router.refresh();
    } else setMsg({ ok: false, text: data.error });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {times.map((v, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Label>{roundLabel(i)}</Label>
          <Input type="datetime-local" className="w-auto" value={v}
            onChange={(e) => setTimes(times.map((t, j) => (j === i ? e.target.value : t)))} />
        </div>
      ))}
      <Button disabled={times.some((t) => !t)} onClick={apply}>Programı uygula</Button>
      {msg && <span className={`pb-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
    </div>
  );
}

export function SwapForm({ tournamentId, players }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  async function swap() {
    setMsg(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "swap", a, b }),
    });
    if (res.ok) {
      setMsg({ ok: true, text: "Takas yapıldı" });
      setA(""); setB("");
      router.refresh();
    } else setMsg({ ok: false, text: (await res.json()).error });
  }
  const opts = (exclude) =>
    players.filter((p) => String(p.id) !== exclude)
      .map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.company ? ` (${p.company})` : ""}</option>);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Oyuncu 1</Label>
        <Select className="w-52" value={a} onChange={(e) => setA(e.target.value)}>
          <option value="">Seçin…</option>{opts(b)}
        </Select>
      </div>
      <span className="pb-2 text-stone-400">⇄</span>
      <div className="flex flex-col gap-1.5">
        <Label>Oyuncu 2</Label>
        <Select className="w-52" value={b} onChange={(e) => setB(e.target.value)}>
          <option value="">Seçin…</option>{opts(a)}
        </Select>
      </div>
      <Button variant="outline" disabled={!a || !b} onClick={swap}>Takas et</Button>
      {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
    </div>
  );
}

async function patchMatch(id, body) {
  const res = await fetch(`/api/admin/matches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) alert("Hata: " + (await res.json()).error);
}

export function MatchControls({ match }) {
  const [at, setAt] = useState("");
  const [checking, setChecking] = useState(false);
  const router = useRouter();
  const m = match;
  const done = () => router.refresh();

  const isChess = !m.game || m.game === "chess" || (!m.room_password && m.game_url?.includes("lichess"));

  async function checkLichess() {
    setChecking(true);
    await patchMatch(m.id, { action: "check" });
    setChecking(false);
    done();
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      {(m.status === "pending" || m.status === "scheduled") && m.p1_id && m.p2_id && (
        <>
          <div className="flex flex-col gap-1">
            <Label>Maç saati</Label>
            <Input type="datetime-local" className="w-auto" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" disabled={!at}
            onClick={() => patchMatch(m.id, { action: "schedule", at: new Date(at).toISOString() }).then(done)}>
            Randevu ver
          </Button>
          <Button size="sm" onClick={() => patchMatch(m.id, { action: "start" }).then(done)}>
            Şimdi başlat
          </Button>
        </>
      )}
      {m.status === "live" && (
        <>
          {m.game_url && (
            <a className="inline-flex h-8 items-center rounded-md border border-stone-300 bg-white px-3 text-xs font-medium shadow-sm hover:bg-stone-100 text-stone-700"
              href={m.game_url} target="_blank" rel="noreferrer">
              İzle ↗ {(!m.p1_joined_at || !m.p2_joined_at) && <span className="ml-1 text-stone-400 font-normal">(katılım bekleniyor)</span>}
            </a>
          )}
          {isChess && (
            <Button variant="secondary" size="sm" disabled={checking} onClick={checkLichess}>
              {checking ? "Kontrol ediliyor..." : "⚡ Lichess'i Kontrol Et"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="border-stone-300"
            onClick={() => confirm(`${m.p1_name} (Beyaz) kazandı olarak işaretlensin mi?`) &&
              patchMatch(m.id, { action: "result", winnerId: m.p1_id }).then(done)}>
            ✓ {isChess ? "⚪ " : ""}{m.p1_name}{isChess ? " (Beyaz)" : ""}
          </Button>
          <Button variant="outline" size="sm" className="border-stone-300"
            onClick={() => confirm(`${m.p2_name} (Siyah) kazandı olarak işaretlensin mi?`) &&
              patchMatch(m.id, { action: "result", winnerId: m.p2_id }).then(done)}>
            ✓ {isChess ? "⚫ " : ""}{m.p2_name}{isChess ? " (Siyah)" : ""}
          </Button>
          <Button variant="destructive" size="sm"
            onClick={() => confirm("Maç sıfırlanıp yeni oyun linki üretilecek. Devam?") &&
              patchMatch(m.id, { action: "reset" }).then(done)}>
            Sıfırla
          </Button>
        </>
      )}
      {m.status === "done" && m.result_detail !== "bye" && (
        <Button variant="destructive" size="sm"
          onClick={() => confirm("Sonuç silinip maç yeniden kurulacak. Üst tura taşınan oyuncuyu elle düzeltmeniz gerekebilir. Devam?") &&
            patchMatch(m.id, { action: "reset" }).then(done)}>
          Sonucu iptal et
        </Button>
      )}
    </div>
  );
}


export function AdminsManager({ admins, myId }) {
  const [f, setF] = useState({ fullName: "", email: "", password: "" });
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function add(e) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/admins", { method: "POST", body: JSON.stringify(f) });
    const data = await res.json();
    if (res.ok) {
      setMsg({ ok: true, text: `Eklendi — parola: ${data.password}` });
      setF({ fullName: "", email: "", password: "" });
      router.refresh();
    } else setMsg({ ok: false, text: data.error });
  }

  async function remove(id) {
    if (!confirm("Bu yönetici silinsin mi?")) return;
    const res = await fetch("/api/admin/admins", { method: "DELETE", body: JSON.stringify({ id }) });
    if (!res.ok) alert((await res.json()).error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Ad Soyad</Label>
          <Input value={f.fullName} onChange={set("fullName")} required placeholder="Ahmet Ünsal" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>E-posta</Label>
          <Input type="email" value={f.email} onChange={set("email")} required placeholder="ahmet@fiba.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Parola (boşsa üretilir)</Label>
          <Input value={f.password} onChange={set("password")} placeholder="otomatik" />
        </div>
        <Button type="submit">Yönetici ekle</Button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </form>
      <div className="flex flex-col divide-y divide-stone-100 rounded-lg border border-stone-200">
        {admins.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="font-medium">{a.full_name}</span>
            <span className="text-stone-500">{a.email}</span>
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">{a.password}</code>
            {a.id === myId && <span className="rounded-full bg-fiba-50 px-2 py-0.5 text-[11px] font-semibold text-fiba-700">sen</span>}
            {a.id !== myId && (
              <Button variant="destructive" size="sm" className="ml-auto" onClick={() => remove(a.id)}>Sil</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeleteTournamentButton({ tid, name }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm(`"${name}" turnuvası tüm maçlarıyla birlikte silinecek. Katılımcılar tekrar kura bekler duruma döner. Emin misiniz?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/tournaments/${tid}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/tournaments");
    else { alert((await res.json()).error); setBusy(false); }
  }
  return (
    <Button variant="destructive" size="sm" onClick={run} disabled={busy}>
      {busy ? "Siliniyor…" : "Turnuvayı sil"}
    </Button>
  );
}

export function ReplaceForm({ tournamentId, seated, subs }) {
  const [out, setOut] = useState("");
  const [inn, setInn] = useState("");
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  async function run() {
    setMsg(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "replace", out, in: inn }),
    });
    const data = await res.json();
    if (res.ok) { setMsg({ ok: true, text: "Değişiklik yapıldı ✓" }); setOut(""); setInn(""); router.refresh(); }
    else setMsg({ ok: false, text: data.error });
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Çıkacak oyuncu</Label>
        <Select className="w-56" value={out} onChange={(e) => setOut(e.target.value)}>
          <option value="">Seçin…</option>
          {seated.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Yerine girecek (yedek)</Label>
        <Select className="w-56" value={inn} onChange={(e) => setInn(e.target.value)}>
          <option value="">Seçin…</option>
          {subs.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.is_reserve ? " (yedek)" : ""}</option>)}
        </Select>
      </div>
      <Button disabled={!out || !inn} onClick={run}>Değiştir</Button>
      {msg && <span className={`pb-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
    </div>
  );
}

export function ResetPasswordButtons({ email }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // 1) Sıfırlama bağlantısı: yönetici parolayı görmez, kişi kendisi belirler
  async function makeLink() {
    setBusy(true);
    const res = await fetch("/api/admin/reset-link", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return alert(data.error);
    try { await navigator.clipboard.writeText(data.url); } catch {}
    prompt(
      `${email} için sıfırlama bağlantısı (${data.expiresInHours} saat geçerli).\n` +
      `Panoya kopyalandı — kişiye iletin:`,
      data.url
    );
  }

  // 2) Doğrudan yeni parola ata (bir kez gösterilir, sonra görülemez)
  async function setNew() {
    const pw = prompt(`${email} için yeni parola (en az 6 karakter):`);
    if (!pw) return;
    setBusy(true);
    const res = await fetch("/api/admin/participants", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: pw }),
    });
    setBusy(false);
    if (!res.ok) alert((await res.json()).error);
    else alert("Parola güncellendi. Bu parolayı kişiye iletin — sistemde bir daha görüntülenemez.");
    router.refresh();
  }

  return (
    <span className="flex items-center gap-1">
      <Button variant="outline" size="sm" disabled={busy} onClick={makeLink}>Sıfırlama bağlantısı</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={setNew}>Parola ata</Button>
    </span>
  );
}

// Katılımcılar sekmesinden hızlı turnuva ataması
export function AssignToTournament({ participantId, tournaments }) {
  const router = useRouter();
  const [tid, setTid] = useState("");
  const [busy, setBusy] = useState(false);
  if (!tournaments.length) return null;
  async function run(isReserve) {
    if (!tid) return;
    setBusy(true);
    const res = await fetch(`/api/admin/tournaments/${tid}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "assign", participantId, isReserve }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) alert(data.error); else router.refresh();
  }
  return (
    <span className="flex items-center gap-1">
      <Select className="h-8 w-36 text-xs" value={tid} onChange={(e) => setTid(e.target.value)}>
        <option value="">Turnuvaya ata…</option>
        {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      <Button size="sm" variant="outline" disabled={!tid || busy} onClick={() => run(false)}>Asil</Button>
      <Button size="sm" variant="outline" disabled={!tid || busy} onClick={() => run(true)}>Yedek</Button>
    </span>
  );
}
