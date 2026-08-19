// Yönetici, bir katılımcı için tek kullanımlık sıfırlama bağlantısı üretir.
// Yönetici parolayı GÖREMEZ; bağlantıyı kişiye iletir, kişi kendi parolasını belirler.
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { makeResetToken } from "@/lib/crypto";

const TTL_MIN = 24 * 60;

export async function POST(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { email } = await req.json();
  const mail = String(email ?? "").trim().toLowerCase();
  const rows = await q("SELECT 1 FROM participants WHERE email = $1 LIMIT 1", [mail]);
  if (!rows.length) return NextResponse.json({ error: "Katılımcı bulunamadı" }, { status: 404 });

  const { raw, hash } = makeResetToken();
  await q(
    `INSERT INTO password_resets (email, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [mail, hash, TTL_MIN]
  );
  await audit("password_reset_link", { email: mail }, admin.email);
  const base = process.env.BASE_URL ?? "";
  return NextResponse.json({ url: `${base}/reset?token=${raw}`, expiresInHours: TTL_MIN / 60 });
}
