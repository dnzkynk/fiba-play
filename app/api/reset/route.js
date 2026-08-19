// Sıfırlama bağlantısıyla yeni parola belirleme (jeton tek kullanımlık ve süreli).
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { hashPassword, hashResetToken } from "@/lib/crypto";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req) {
  if (!rateLimit(`reset:${clientIp(req)}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "rate" }, { status: 429 });
  }
  const { token, password } = await req.json().catch(() => ({}));
  const pass = String(password ?? "").trim();
  if (pass.length < 6) return NextResponse.json({ error: "short" }, { status: 400 });

  const [row] = await q(
    `SELECT * FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() LIMIT 1`,
    [hashResetToken(token ?? "")]
  );
  if (!row) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await q("UPDATE participants SET password = $1 WHERE email = $2", [hashPassword(pass), row.email]);
  await q("UPDATE password_resets SET used_at = now() WHERE id = $1", [row.id]);
  // Aynı kişinin bekleyen diğer jetonları da geçersiz olsun
  await q("UPDATE password_resets SET used_at = now() WHERE email = $1 AND used_at IS NULL", [row.email]);
  await audit("password_reset_done", { email: row.email }, "oyuncu");
  return NextResponse.json({ ok: true });
}
