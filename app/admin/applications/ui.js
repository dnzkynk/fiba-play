"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export function ApplicationActions({ id, status, tournaments = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tid, setTid] = useState("");

  async function act(action, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch("/api/admin/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, tournamentId: tid || undefined }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else {
      let msg = "";
      if (data.password) msg += `Katılımcı açıldı — parola: ${data.password}`;
      if (data.assignError) msg += `\n⚠ Turnuvaya atanamadı: ${data.assignError}`;
      else if (tid) msg += `\nSeçilen turnuvaya atandı.`;
      if (msg) alert(msg.trim());
    }
    setBusy(false);
    router.refresh();
  }

  if (status !== "new") {
    return (
      <Button variant="destructive" size="sm" disabled={busy}
        onClick={() => act("delete", "Başvuru silinsin mi? (Açılmış katılımcı hesabı varsa durur)")}>
        Sil
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap justify-end gap-1.5">
      {tournaments.length > 0 && (
        <Select className="h-8 w-40 text-xs" value={tid} onChange={(e) => setTid(e.target.value)} title="Onayınca atanacak turnuva">
          <option value="">Turnuva: atama yok</option>
          {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      )}
      <Button size="sm" disabled={busy} onClick={() => act("approve")}>Asil yap</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => act("reserve")}>Yedek yap</Button>
      <Button variant="destructive" size="sm" disabled={busy}
        onClick={() => act("delete", "Başvuru silinsin mi?")}>Sil</Button>
    </span>
  );
}
