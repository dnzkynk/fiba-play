// Başvuru yönetimi: asil/yedek olarak katılımcıya çevirme ve silme.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { q, audit } from "@/lib/db";
import { requireAdmin, generatePassword } from "@/lib/auth";
import { encryptPassword, decryptPassword } from "@/lib/crypto";
import { assignPlayer } from "@/lib/engine";

export async function POST(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id, action, tournamentId } = await req.json();
  const [a] = await q("SELECT * FROM applications WHERE id = $1", [id]);
  if (!a) return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });

  if (action === "delete") {
    await q("DELETE FROM applications WHERE id = $1", [id]);
    await audit("application_delete", { id, email: a.email }, admin.email);
    return NextResponse.json({ ok: true });
  }

  if (action !== "approve" && action !== "reserve")
    return NextResponse.json({ error: "Bilinmeyen işlem" }, { status: 400 });
  const isReserve = action === "reserve";

  // Katılımcı kaydı (email başına tek): varsa kullan, yoksa aç. Parola sırası:
  // önceki katılımcı parolası > başvuranın seçtiği > otomatik (hepsi şifreli saklanır).
  let [participant] = await q(
    "SELECT * FROM participants WHERE email = $1 AND game = 'chess' LIMIT 1",
    [a.email]
  );
  if (!participant) {
    const password = a.password ?? encryptPassword(generatePassword());
    [participant] = await q(
      `INSERT INTO participants (full_name, email, company, game, bracket_size, token, password, is_reserve)
       VALUES ($1,$2,$3,'chess',64,$4,$5,$6) RETURNING *`,
      [a.full_name, a.email, a.company, crypto.randomBytes(16).toString("hex"), password, isReserve]
    );
  }

  // Turnuva seçildiyse üyelik ata (aynı turnuvaya iki kez engellenir)
  let assignError = null;
  const tid = parseInt(tournamentId, 10);
  if (Number.isFinite(tid)) {
    try {
      await assignPlayer(tid, participant.id, isReserve, admin.email);
    } catch (err) {
      assignError = err.message;
    }
  }

  await q("UPDATE applications SET status = $1 WHERE id = $2", [isReserve ? "reserve" : "approved", id]);
  await audit("application_convert", { id, email: a.email, isReserve, tournamentId: tid || null }, admin.email);
  return NextResponse.json({
    ok: true,
    password: decryptPassword(participant.password),
    assignError,
  });
}
