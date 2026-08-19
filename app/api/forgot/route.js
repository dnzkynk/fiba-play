// "Parolamı unuttum": e-posta ile tek kullanımlık sıfırlama jetonu üretir.
// Kullanıcı sayımı (enumeration) sızmasın diye yanıt her zaman aynıdır.
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { makeResetToken } from "@/lib/crypto";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const TTL_MIN = 60;

export async function POST(req) {
  if (!rateLimit(`forgot:${clientIp(req)}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const { email } = await req.json().catch(() => ({}));
  const mail = String(email ?? "").trim().toLowerCase();

  const rows = await q("SELECT 1 FROM participants WHERE email = $1 LIMIT 1", [mail]);
  if (rows.length) {
    const { raw, hash } = makeResetToken();
    await q(
      `INSERT INTO password_resets (email, token_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))`,
      [mail, hash, TTL_MIN]
    );
    await audit("password_reset_requested", { email: mail }, "oyuncu");
    // E-posta altyapısı yok: bağlantı yöneticiye panelde görünür, oradan iletilir.
    // (SMTP eklenirse burada gönderim yapılır.)
    if (process.env.NODE_ENV !== "production") console.log("sıfırlama bağlantısı:", `/reset?token=${raw}`);
  }
  return NextResponse.json({ ok: true });
}
