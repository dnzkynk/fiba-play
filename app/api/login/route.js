import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { makeSession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req) {
  if (!rateLimit(`login:${clientIp(req)}`, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Çok fazla deneme — 1 dakika bekleyin" }, { status: 429 });
  }
  const { email, password } = await req.json();
  const rows = await q("SELECT * FROM participants WHERE email = $1", [
    (email ?? "").trim().toLowerCase(),
  ]);
  const match = rows.find((r) => r.password && r.password === (password ?? "").trim());
  if (!match) {
    return NextResponse.json({ error: "E-posta veya parola hatalı" }, { status: 401 });
  }
  const store = await cookies();
  store.delete("fiba_admin"); // aynı tarayıcıda admin+oyuncu karışmasın
  store.set("fiba_user", makeSession(match.email), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
