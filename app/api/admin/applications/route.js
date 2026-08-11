// Başvuru yönetimi: asil/yedek olarak katılımcıya çevirme ve silme.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { q, audit } from "@/lib/db";
import { requireAdmin, generatePassword } from "@/lib/auth";

export async function POST(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id, action, size } = await req.json();
  const [a] = await q("SELECT * FROM applications WHERE id = $1", [id]);
  if (!a) return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });

  if (action === "delete") {
    await q("DELETE FROM applications WHERE id = $1", [id]);
    await audit("application_delete", { id, email: a.email }, admin.email);
    return NextResponse.json({ ok: true });
  }

  if (action !== "approve" && action !== "reserve")
    return NextResponse.json({ error: "Bilinmeyen işlem" }, { status: 400 });

  const bracket = [8, 16, 32, 64].includes(parseInt(size, 10)) ? parseInt(size, 10) : 64;
  const isReserve = action === "reserve";

  // Kura bekleyen bir kaydı zaten varsa ikinci kez katılımcı açma
  const waiting = await q(
    `SELECT 1 FROM participants p WHERE p.email = $1 AND p.game = 'chess'
       AND NOT EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
                       WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id)) LIMIT 1`,
    [a.email]
  );
  if (waiting.length) {
    await q("UPDATE applications SET status = $1 WHERE id = $2", [isReserve ? "reserve" : "approved", id]);
    return NextResponse.json({ error: "Bu kişi zaten katılımcı olarak kayıtlı" }, { status: 400 });
  }

  const [existing] = await q(
    "SELECT password FROM participants WHERE email = $1 AND password IS NOT NULL LIMIT 1",
    [a.email]
  );
  const password = existing?.password ?? generatePassword();
  await q(
    `INSERT INTO participants (full_name, email, company, game, bracket_size, token, password, is_reserve)
     VALUES ($1,$2,$3,'chess',$4,$5,$6,$7)`,
    [a.full_name, a.email, a.company, bracket, crypto.randomBytes(16).toString("hex"), password, isReserve]
  );
  await q("UPDATE applications SET status = $1 WHERE id = $2", [isReserve ? "reserve" : "approved", id]);
  await audit("application_convert", { id, email: a.email, isReserve }, admin.email);
  return NextResponse.json({ ok: true, password });
}
