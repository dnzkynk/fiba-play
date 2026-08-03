// Turnuva işlemleri: kura düzeltme (oyuncu takası)
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { swapSeats, scheduleTournament } from "@/lib/engine";

export async function PATCH(req, { params }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    if (body.action === "swap") {
      await swapSeats(parseInt(id, 10), parseInt(body.a, 10), parseInt(body.b, 10), admin.email);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "schedule") {
      const result = await scheduleTournament(parseInt(id, 10), body.startsAt, body.intervalHours, admin.email);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Bilinmeyen işlem" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
