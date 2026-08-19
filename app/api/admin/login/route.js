import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { makeSession, COOKIE_OPTS } from "@/lib/auth";
import { passwordMatches, needsUpgrade, hashPassword } from "@/lib/crypto";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req) {
  if (!rateLimit(`admin:${clientIp(req)}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Çok fazla deneme — 1 dakika bekleyin" }, { status: 429 });
  }
  const { email, password } = await req.json();
  const [admin] = await q("SELECT * FROM admins WHERE email = $1", [
    (email ?? "").trim().toLowerCase(),
  ]);
  if (!admin || !passwordMatches(password, admin.password)) {
    return NextResponse.json({ error: "E-posta veya parola hatalı" }, { status: 401 });
  }
  if (needsUpgrade(admin.password)) {
    await q("UPDATE admins SET password = $1 WHERE id = $2", [
      hashPassword(String(password).trim()), admin.id,
    ]);
  }
  const store = await cookies();
  store.delete("fiba_user"); // aynı tarayıcıda admin+oyuncu karışmasın
  store.set("fiba_admin", makeSession(`admin:${admin.email}`), {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 14,
  });
  await audit("admin_login", { email: admin.email }, admin.email);
  return NextResponse.json({ ok: true });
}
