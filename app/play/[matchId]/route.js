// "Maça katıl": giriş yapmış oyuncunun tıklamasını kaydeder (no-show tespiti)
// ve oyuna yönlendirir. Tavlada kullanıcı adı URL'ye eklenir — yamalı web istemcisi
// bu adla otomatik bağlanır, yamalı sunucu da odayı otomatik kurar/katılır.
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { currentPlayerRows } from "@/lib/auth";
import { assignedUsername } from "@/lib/bgammon";
import { ensureWatcher } from "@/lib/watcher";

export async function GET(req, { params }) {
  ensureWatcher();
  const { matchId } = await params;
  const myRows = await currentPlayerRows();
  if (!myRows.length) return NextResponse.redirect(new URL("/login", process.env.BASE_URL));

  const myIds = myRows.map((r) => r.id);
  const [m] = await q(
    `SELECT m.*, t.game AS tgame FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     WHERE m.id = $1 AND (m.p1_id = ANY($2) OR m.p2_id = ANY($2))`,
    [parseInt(matchId, 10), myIds]
  );
  if (!m || m.status !== "live" || !m.game_url) {
    return NextResponse.redirect(new URL("/me", process.env.BASE_URL));
  }

  const isP1 = myIds.includes(m.p1_id);
  const col = isP1 ? "p1_joined_at" : "p2_joined_at";
  await q(`UPDATE matches SET ${col} = COALESCE(${col}, now()) WHERE id = $1`, [m.id]);

  if (m.tgame === "tavla") {
    const me = myRows.find((r) => r.id === (isP1 ? m.p1_id : m.p2_id));
    const url = new URL(m.game_url);
    url.searchParams.set("username", assignedUsername(me));
    if (process.env.BGAMMON_WS_URL) url.searchParams.set("server", process.env.BGAMMON_WS_URL);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(isP1 ? m.p1_url : m.p2_url);
}
