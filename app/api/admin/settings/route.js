import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, setSetting } from "@/lib/settings";
import { audit } from "@/lib/db";

const ALLOWED = ["chess_clock_limit", "chess_clock_increment", "tavla_points", "no_show_minutes"];

export async function POST(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = await req.json();
  for (const key of ALLOWED) {
    if (body[key] !== undefined) {
      const n = parseInt(body[key], 10);
      if (!Number.isFinite(n) || n < 0)
        return NextResponse.json({ error: `Geçersiz değer: ${key}` }, { status: 400 });
      await setSetting(key, n);
    }
  }
  await audit("settings", body, admin.email);
  return NextResponse.json(await getSettings());
}
