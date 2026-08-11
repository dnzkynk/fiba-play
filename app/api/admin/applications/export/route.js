// Başvuru listesi CSV (İK/organizasyonla paylaşmak için)
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";

const STATUS_TR = { new: "Bekliyor", approved: "Asil", reserve: "Yedek" };

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return new Response("Yetkisiz", { status: 401 });
  }
  const rows = await q("SELECT * FROM applications ORDER BY created_at");
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [
    ["Ad Soyad", "E-posta", "Telefon", "Ülke", "Şirket", "Durum", "Başvuru tarihi"].map(esc).join(";"),
    ...rows.map((r) =>
      [r.full_name, r.email, r.phone, r.country, r.company, STATUS_TR[r.status] ?? r.status,
       new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ") + " UTC"].map(esc).join(";")
    ),
  ];
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=basvurular.csv",
    },
  });
}
