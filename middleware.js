// Kaba kuvvet / bot trafiğine karşı genel hız sınırı.
// Yazma işlemleri (POST/PATCH/DELETE) ve tüm API çağrıları IP başına sınırlanır;
// sayfa görüntülemeler daha geniş bir sınırla korunur.
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export function middleware(req) {
  const ip = clientIp(req);
  const isWrite = req.method !== "GET" && req.method !== "HEAD";
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  // Yazma: 60/dk · API okuma: 300/dk · sayfa: 600/dk
  const [key, max] = isWrite
    ? [`w:${ip}`, 60]
    : isApi
      ? [`a:${ip}`, 300]
      : [`p:${ip}`, 600];

  if (!rateLimit(key, { max, windowMs: 60_000 })) {
    return new NextResponse(JSON.stringify({ error: "Çok fazla istek — biraz bekleyin" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "60" },
    });
  }
  return NextResponse.next();
}

export const config = {
  // Statik dosyalar ve oyun istemcisi hariç
  matcher: ["/((?!_next/static|_next/image|favicon.ico|tavla/).*)"],
};
