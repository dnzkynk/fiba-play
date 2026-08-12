// Boş turnuva oluşturma (kura sonra çekilir).
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createTournament } from "@/lib/engine";

export async function POST(req) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const b = await req.json();
  try {
    const t = await createTournament(
      { name: b.name, bracketSize: b.bracketSize, game: b.game === "tavla" ? "tavla" : "chess", roundTimes: b.roundTimes },
      admin.email
    );
    return NextResponse.json(t);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
