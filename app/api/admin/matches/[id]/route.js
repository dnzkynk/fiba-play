// Maç işlemleri: randevu ver, başlat (link üret), sonuç yaz (override/hükmen), sıfırla (rövanş).
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { recordResult, resetMatch } from "@/lib/engine";
import { startMatch, ensureWatcher } from "@/lib/watcher";

export async function PATCH(req, { params }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  ensureWatcher();
  const { id } = await params;
  const matchId = parseInt(id, 10);
  const body = await req.json();

  try {
    switch (body.action) {
      case "schedule": {
        // body.at: ISO tarih — 1 saatlik pencerenin başlangıcı
        await q(
          `UPDATE matches SET scheduled_at = $1, status = 'scheduled', updated_at = now()
           WHERE id = $2 AND status IN ('pending','scheduled')`,
          [body.at, matchId]
        );
        await audit("schedule", { matchId, at: body.at }, admin.email);
        break;
      }
      case "start": {
        await startMatch(matchId);
        break;
      }
      case "result": {
        // body.winnerId (null = beraberlik), body.forfeit (true = hükmen)
        await recordResult(
          matchId,
          body.winnerId ?? null,
          body.forfeit ? "forfeit" : "admin",
          body.detail ?? (body.forfeit ? "no-show" : "admin kararı"),
          admin.email
        );
        break;
      }
      case "reset": {
        await resetMatch(matchId, { actor: admin.email });
        break;
      }
      default:
        return NextResponse.json({ error: "Bilinmeyen işlem" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  const [m] = await q("SELECT * FROM matches WHERE id = $1", [matchId]);
  return NextResponse.json(m);
}
