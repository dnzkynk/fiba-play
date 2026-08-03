// bgammon sunucusundan maç sonu bildirimi (pkg/server/webhook.go yaması gönderir):
//   { "secret": "...", "game": "fiba-<tid>-<matchId>", "player1": "...", "player2": "...",
//     "winner": "<kazanan kullanıcı adı>", "points": 3 }
// Kazanan, portalın oyunculara atadığı kullanıcı adıyla (assignedUsername) eşlenir.
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { recordResult } from "@/lib/engine";
import { assignedUsername } from "@/lib/bgammon";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || !process.env.BGAMMON_WEBHOOK_SECRET || body.secret !== process.env.BGAMMON_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [m] = await q("SELECT * FROM matches WHERE game_id = $1 AND status = 'live'", [body.game]);
  if (!m) return NextResponse.json({ error: "match not found" }, { status: 404 });

  const [p1] = await q("SELECT * FROM participants WHERE id = $1", [m.p1_id]);
  const [p2] = await q("SELECT * FROM participants WHERE id = $1", [m.p2_id]);
  // bgammon misafir adlarına "Guest_" öneki ekler — eşleşmede öneki yok say
  const winner = (body.winner ?? "").toLowerCase().replace(/^guest_/, "");

  let winnerId = null;
  if (winner === assignedUsername(p1)) winnerId = p1.id;
  else if (winner === assignedUsername(p2)) winnerId = p2.id;
  else {
    // Atanan adla girilmemiş: sonucu işleme, admin karar versin
    await audit("bgammon_unmatched", { matchId: m.id, body });
    return NextResponse.json({ error: "winner username not recognized" }, { status: 422 });
  }

  await recordResult(m.id, winnerId, "auto", `bgammon ${body.points ?? ""}p`.trim());
  await audit("bgammon_webhook", { matchId: m.id, game: body.game, winner: body.winner });
  return NextResponse.json({ ok: true });
}
