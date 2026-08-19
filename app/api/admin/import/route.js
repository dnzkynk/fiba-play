// CSV import: kolonlar -> ad_soyad,email,sirket,oyun,turnuva_boyu
// oyun: satranc|chess|tavla ; turnuva_boyu: 8|16|32|64
// Aynı (email, oyun) tekrar gelirse kayıt güncellenir (upsert), mükerrer oluşmaz.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { q, audit } from "@/lib/db";
import { requireAdmin, generatePassword } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { TAVLA_ENABLED } from "@/lib/features";

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
    const [fullName, email, company, gameRaw, sizeRaw, reserveRaw] = cols;
    const isReserve = /yedek|reserve/i.test(reserveRaw ?? "");
    const game = /tavla/i.test(gameRaw) ? (TAVLA_ENABLED ? "tavla" : "kapali") : /satran|chess/i.test(gameRaw) ? "chess" : null;
    if (game === "kapali") return errors.push(`Satır ${lineNo}: tavla kayıtları kapalı — yalnızca satranç`);
    const size = parseInt(sizeRaw, 10);
    if (!fullName) errors.push(`Satır ${lineNo}: ad soyad boş`);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`Satır ${lineNo}: geçersiz e-posta (${email})`);
    if (!game) errors.push(`Satır ${lineNo}: oyun 'satranc' veya 'tavla' olmalı (${gameRaw})`);
    if (![8, 16, 32, 64].includes(size)) errors.push(`Satır ${lineNo}: turnuva boyu 8/16/32/64 olmalı (${sizeRaw})`);
    if (fullName && game && [8, 16, 32, 64].includes(size)) {
      rows.push({ fullName, email: email.toLowerCase(), company, game, size, isReserve });
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
    // Kura bekleyen kaydı varsa güncelle; yoksa yeni kayıt ekle (çoklu turnuva desteği)
    const [waiting] = await q(
      `SELECT p.id FROM participants p WHERE p.email = $1 AND p.game = $2
         AND NOT EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
                         WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id)) LIMIT 1`,
      [r.email, r.game]
    );
    if (waiting) {
      await q(
        `UPDATE participants SET full_name = $1, company = $2, bracket_size = $3, is_reserve = $4 WHERE id = $5`,
        [r.fullName, r.company || null, r.size, r.isReserve, waiting.id]
      );
      updated++;
    } else {
      await q(
        `INSERT INTO participants (full_name, email, company, game, bracket_size, token, password, is_reserve)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [r.fullName, r.email, r.company || null, r.game, r.size,
         crypto.randomBytes(16).toString("hex"), existing?.password ?? hashPassword(generatePassword()), r.isReserve]
      );
      inserted++;
    }
  }
  await audit("import", { inserted, updated }, admin.email);
  return NextResponse.json({ inserted, updated });
}
