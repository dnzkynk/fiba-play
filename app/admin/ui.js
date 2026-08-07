"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
  const [f, setF] = useState({ fullName: "", email: "", company: "", size: "16" });
  const [games, setGames] = useState({ chess: true, tavla: false });
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
      body: JSON.stringify({ ...f, games: selected }),
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
          <Input className="w-44" value={f.fullName} onChange={set("fullName")} required placeholder="Ali Veli" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>E-posta</Label>
          <Input className="w-52" type="email" value={f.email} onChange={set("email")} required placeholder="ali@fiba.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Şirket</Label>
          <Input className="w-36" value={f.company} onChange={set("company")} placeholder="FibaBanka" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Oyunlar</Label>
          <div className="flex h-9 items-center gap-3 rounded-md border border-stone-300 bg-white px-3">
            {[["chess", "♟ Satranç"], ["tavla", "🎲 Tavla"]].map(([key, label]) => (
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
        Kolonlar: <code className="rounded bg-white px-1 py-0.5">ad_soyad, email, sirket, oyun(satranc/tavla), turnuva_boyu(8/16/32/64)</code>{" "}
        — Excel'den CSV olarak dışa aktarıp yükleyin veya yapıştırın. Parolalar otomatik üretilir.
      </p>
      <input type="file" accept=".csv,.txt" className="mb-2 block text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) file.text().then(setCsv);
        }} />
      <Textarea placeholder={"Ali Veli, ali.veli@fiba.com, FibaBanka, satranc, 16"}
        value={csv} onChange={(e) => setCsv(e.target.value)} />
      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" disabled={!csv.trim()}>İçe aktar</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Kapat</Button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}

export function GenerateButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function run() {
    if (!confirm("Turnuvaya dağıtılmamış tüm katılımcılar için turnuvalar oluşturulup kura çekilecek. Devam?")) return;
    setBusy(true);
    const res = await fetch("/api/admin/generate", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      alert(data.created.length ? `${data.created.length} turnuva oluşturuldu` : "Dağıtılacak yeni katılımcı yok");
      router.refresh();
    } else alert(data.error);
  }
  return (
    <Button onClick={run} disabled={busy}>
      {busy ? "Kura çekiliyor…" : "Kura çek"}
    </Button>
  );
}

export function SettingsForm({ initial }) {
  const [chessTime, setChessTime] = useState(`${initial.chess_clock_limit ?? "600"}:${initial.chess_clock_increment ?? "5"}`);
  const [tavlaPoints, setTavlaPoints] = useState(initial.tavla_points ?? "3");
  const [msg, setMsg] = useState(null);

  async function save(e) {
    e.preventDefault();
    const [limit, inc] = chessTime.split(":");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      body: JSON.stringify({ chess_clock_limit: limit, chess_clock_increment: inc, tavla_points: tavlaPoints }),
    });
    setMsg(res.ok ? { ok: true, text: "Kaydedildi ✓" } : { ok: false, text: (await res.json()).error });
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-4">
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
      <Button type="submit">Kaydet</Button>
      {msg && <span className={`pb-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
    </form>
  );
}

export function TournamentScheduleForm({ tournamentId, startsAt, intervalHours }) {
  const toLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [at, setAt] = useState(toLocal(startsAt));
  const [interval, setIntervalHours] = useState(String(intervalHours ?? 24));
  const [msg, setMsg] = useState(null);
  const router = useRouter();

  async function apply() {
    setMsg(null);
    const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "schedule",
        startsAt: new Date(at).toISOString(),
        intervalHours: parseInt(interval, 10),
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
      <div className="flex flex-col gap-1.5">
        <Label>1. tur başlangıcı</Label>
        <Input type="datetime-local" className="w-auto" value={at} onChange={(e) => setAt(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Tur aralığı</Label>
        <Select className="w-36" value={interval} onChange={(e) => setIntervalHours(e.target.value)}>
          <option value="1">1 saat</option>
          <option value="2">2 saat</option>
          <option value="3">3 saat</option>
          <option value="6">6 saat</option>
          <option value="12">12 saat</option>
          <option value="24">1 gün</option>
          <option value="48">2 gün</option>
          <option value="168">1 hafta</option>
        </Select>
      </div>
      <Button disabled={!at} onClick={apply}>Programı uygula</Button>
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
  const router = useRouter();
  const m = match;
  const done = () => router.refresh();

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
          {m.p1_joined_at && m.p2_joined_at ? (
            <a className="inline-flex h-8 items-center rounded-md border border-stone-300 bg-white px-3 text-xs font-medium shadow-sm hover:bg-stone-100"
              href={m.game_url} target="_blank" rel="noreferrer">İzle ↗</a>
          ) : (
            <span className="text-xs text-stone-400">İzleme, iki oyuncu da girince açılır</span>
          )}
          <Button variant="outline" size="sm"
            onClick={() => confirm(`${m.p1_name} kazandı olarak işaretlensin mi?`) &&
              patchMatch(m.id, { action: "result", winnerId: m.p1_id }).then(done)}>
            ✓ {m.p1_name}
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => confirm(`${m.p2_name} kazandı olarak işaretlensin mi?`) &&
              patchMatch(m.id, { action: "result", winnerId: m.p2_id }).then(done)}>
            ✓ {m.p2_name}
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
