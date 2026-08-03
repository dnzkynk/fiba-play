// Teşhis: watcher canlı mı, tick atıyor mu, son hata ne?
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ensureWatcher, watcherState } from "@/lib/watcher";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureWatcher();
  const [{ live }] = await q("SELECT count(*)::int AS live FROM matches WHERE status = 'live'");
  return NextResponse.json({
    now: new Date().toISOString(),
    liveMatches: live,
    watcher: watcherState(),
  });
}
