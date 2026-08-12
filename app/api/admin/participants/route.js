// Panelden tek tek katılımcı ekleme. Parola otomatik üretilir; aynı e-posta
// başka oyunda zaten kayıtlıysa aynı parola kullanılır (kişi tek parolayla girer).
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { q, audit } from "@/lib/db";
import { requireAdmin, generatePassword } from "@/lib/auth";
import { encryptPassword, decryptPassword } from "@/lib/crypto";
import { TAVLA_ENABLED } from "@/lib/features";

// Katılımcı listesi (otomasyon/yedekleme için)
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const rows = await q(
    `SELECT p.id, p.full_name, p.email, p.company, p.game, p.bracket_size,
            EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
                    WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id)) AS assigned
     FROM participants p ORDER BY p.id`
  );
  return NextResponse.json(rows);
}

export async function POST(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const b = await req.json();
  const email = (b.email ?? "").trim().toLowerCase();
  const allowed = TAVLA_ENABLED ? ["chess", "tavla"] : ["chess"];
  const games = Array.isArray(b.games) && b.games.length
    ? b.games.filter((g) => allowed.includes(g))
    : [b.game === "tavla" && TAVLA_ENABLED ? "tavla" : "chess"];
  if (!games.length)
    return NextResponse.json({ error: "Tavla kayıtları kapalı — yalnızca satranç eklenebilir" }, { status: 400 });
  const size = parseInt(b.size, 10);
  if (!b.fullName?.trim()) return NextResponse.json({ error: "Ad soyad gerekli" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Geçerli bir e-posta girin" }, { status: 400 });
  if (![8, 16, 32, 64].includes(size))
    return NextResponse.json({ error: "Turnuva boyu 8/16/32/64 olmalı" }, { status: 400 });

  const [existing] = await q(
    "SELECT password FROM participants WHERE email = $1 AND password IS NOT NULL LIMIT 1",
    [email]
  );
  // Saklanan hep şifreli; gösterime dönen düz metin ayrı tutulur
  const plainPassword = existing ? null : generatePassword();
  const storedPassword = existing?.password ?? encryptPassword(plainPassword);

  // Aynı oyunda hâlâ kura bekleyen kaydı varsa tekrar ekleme (çifte kura önlenir);
  // önceki turnuvası kurulmuş/bitmişse yeni turnuva için tekrar kaydolabilir.
  for (const game of games) {
    const waiting = await q(
      `SELECT 1 FROM participants p WHERE p.email = $1 AND p.game = $2
         AND NOT EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
                         WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id)) LIMIT 1`,
      [email, game]
    );
    if (waiting.length)
      return NextResponse.json(
        { error: `Bu kişi ${game === "chess" ? "satrançta" : "tavlada"} zaten kura bekliyor` },
        { status: 400 }
      );
  }

  try {
    const created = [];
    for (const game of games) {
      const [p] = await q(
        `INSERT INTO participants (full_name, email, company, game, bracket_size, token, password, is_reserve)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [b.fullName.trim(), email, b.company?.trim() || null, game, size,
         crypto.randomBytes(16).toString("hex"), storedPassword, !!b.isReserve]
      );
      created.push(p);
    }
    await audit("participant_add", { email, games }, admin.email);
    const shown = plainPassword ?? decryptPassword(existing.password);
    return NextResponse.json({ ...created[0], password: shown, games });
  } catch (err) {
    throw err;
  }
}

// Parola değiştirme: aynı e-postanın tüm kayıtlarında geçerli (kişi tek parolayla girer)
export async function PATCH(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const b = await req.json();
  const email = (b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "").trim();
  if (!email) return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Parola en az 6 karakter olmalı" }, { status: 400 });
  const rows = await q("UPDATE participants SET password = $1 WHERE email = $2 RETURNING id", [encryptPassword(password), email]);
  if (!rows.length) return NextResponse.json({ error: "Katılımcı bulunamadı" }, { status: 404 });
  await audit("password_change", { email }, admin.email);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await req.json();
  const used = await q(
    "SELECT 1 FROM matches WHERE p1_id = $1 OR p2_id = $1 LIMIT 1", [id]
  );
  if (used.length)
    return NextResponse.json({ error: "Turnuvaya dağıtılmış katılımcı silinemez" }, { status: 400 });
  await q("DELETE FROM participants WHERE id = $1", [id]);
  await audit("participant_delete", { id }, admin.email);
  return NextResponse.json({ ok: true });
}
