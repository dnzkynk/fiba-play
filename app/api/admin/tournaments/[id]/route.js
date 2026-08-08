// Turnuva işlemleri: kura düzeltme (oyuncu takası), program, silme
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { q, audit } from "@/lib/db";
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

// Turnuvayı maçlarıyla birlikte siler. Katılımcı kayıtları durur ve tekrar
// "kura bekliyor" durumuna döner (yanlış kurulan turnuvanın geri alınması).
export async function DELETE(req, { params }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await params;
  const tid = parseInt(id, 10);
  const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [tid]);
  if (!t) return NextResponse.json({ error: "Turnuva bulunamadı" }, { status: 404 });
  await q("DELETE FROM matches WHERE tournament_id = $1", [tid]);
  await q("DELETE FROM tournaments WHERE id = $1", [tid]);
  await audit("tournament_delete", { tid, name: t.name }, admin.email);
  return NextResponse.json({ ok: true });
}
