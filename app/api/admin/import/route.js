// CSV import: kolonlar -> ad_soyad,email,sirket,oyun,turnuva_boyu
// oyun: satranc|chess|tavla ; turnuva_boyu: 8|16|32|64
// Aynı (email, oyun) tekrar gelirse kayıt güncellenir (upsert), mükerrer oluşmaz.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { q, audit } from "@/lib/db";
import { requireAdmin, generatePassword } from "@/lib/auth";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["Dosya boş"] };
  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("email") || header.includes("posta");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = [];
  const errors = [];
  dataLines.forEach((line, i) => {
    const cols = line.split(/[;,]/).map((c) => c.trim());
    const lineNo = i + (hasHeader ? 2 : 1);
    if (cols.length < 5) return errors.push(`Satır ${lineNo}: eksik kolon (5 gerekli)`);
    const [fullName, email, company, gameRaw, sizeRaw] = cols;
    const game = /tavla/i.test(gameRaw) ? "tavla" : /satran|chess/i.test(gameRaw) ? "chess" : null;
    const size = parseInt(sizeRaw, 10);
    if (!fullName) errors.push(`Satır ${lineNo}: ad soyad boş`);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`Satır ${lineNo}: geçersiz e-posta (${email})`);
    if (!game) errors.push(`Satır ${lineNo}: oyun 'satranc' veya 'tavla' olmalı (${gameRaw})`);
    if (![8, 16, 32, 64].includes(size)) errors.push(`Satır ${lineNo}: turnuva boyu 8/16/32/64 olmalı (${sizeRaw})`);
    if (fullName && game && [8, 16, 32, 64].includes(size)) {
      rows.push({ fullName, email: email.toLowerCase(), company, game, size });
    }
  });
  return { rows, errors };
}

export async function POST(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const text = await req.text();
  const { rows, errors } = parseCsv(text);
  if (errors.length) return NextResponse.json({ errors }, { status: 400 });

  let inserted = 0, updated = 0;
  for (const r of rows) {
    // Aynı e-postanın önceki kaydı varsa aynı parolayla devam et (kişi tek parolayla girer)
    const [existing] = await q(
      "SELECT password FROM participants WHERE email = $1 AND password IS NOT NULL LIMIT 1",
      [r.email]
    );
    const res = await q(
      `INSERT INTO participants (full_name, email, company, game, bracket_size, token, password)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email, game) DO UPDATE
         SET full_name = EXCLUDED.full_name, company = EXCLUDED.company,
             bracket_size = EXCLUDED.bracket_size,
             password = COALESCE(participants.password, EXCLUDED.password)
       RETURNING (xmax = 0) AS is_insert`,
      [r.fullName, r.email, r.company || null, r.game, r.size,
       crypto.randomBytes(16).toString("hex"), existing?.password ?? generatePassword()]
    );
    res[0].is_insert ? inserted++ : updated++;
  }
  await audit("import", { inserted, updated }, admin.email);
  return NextResponse.json({ inserted, updated });
}
