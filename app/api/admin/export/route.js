// Parola listesi CSV'si — İK'nın katılımcılara toplu iletmesi için.
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const rows = await q(
    `SELECT full_name, email, company,
            string_agg(CASE WHEN game = 'chess' THEN 'Satranç' ELSE 'Tavla' END, ' + ' ORDER BY game) AS games,
            min(password) AS password
     FROM participants GROUP BY full_name, email, company ORDER BY full_name`
  );
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const csv = [
    ["Ad Soyad", "E-posta", "Şirket", "Turnuva", "Giriş adresi"].map(esc).join(";"),
    ...rows.map((r) =>
      [r.full_name, r.email, r.company, r.games, `${process.env.BASE_URL}/login`].map(esc).join(";")
    ),
  ].join("\r\n");
  await audit("export_passwords", { count: rows.length }, admin.email);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fiba-oyunlari-parolalar.csv"',
    },
  });
}
