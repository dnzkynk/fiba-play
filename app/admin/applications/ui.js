"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ApplicationActions({ id, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action, confirmText) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch("/api/admin/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, size: 64 }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else if (data.password) alert(`Katılımcı açıldı — parola: ${data.password}\n(Parola listesi CSV'sinden de ulaşabilirsiniz.)`);
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
    <span className="flex justify-end gap-1.5">
      <Button size="sm" disabled={busy} onClick={() => act("approve")}>Asil yap</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => act("reserve")}>Yedek yap</Button>
      <Button variant="destructive" size="sm" disabled={busy}
        onClick={() => act("delete", "Başvuru silinsin mi?")}>Sil</Button>
    </span>
  );
}
