// bgammon sunucusu (auto-join yaması) giriş yapan kullanıcıyı sorar:
// bu kullanıcı adına atanmış canlı tavla maçı var mı, varsa oda mı kursun odaya mı katılsın?
// P1 odayı kurar; P2, P1'in sunucudaki adı üzerinden katılır (join oyuncu adıyla çalışır).
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { assignedUsername } from "@/lib/bgammon";
import { getSettings } from "@/lib/settings";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (!process.env.BGAMMON_WEBHOOK_SECRET || searchParams.get("secret") !== process.env.BGAMMON_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const username = (searchParams.get("username") ?? "").toLowerCase().replace(/^guest_/, "");

  const live = await q(
    `SELECT m.*, p1.id AS p1id, p1.full_name AS p1name, p2.id AS p2id, p2.full_name AS p2name
     FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     JOIN participants p1 ON p1.id = m.p1_id
     JOIN participants p2 ON p2.id = m.p2_id
     WHERE t.game = 'tavla' AND m.status = 'live'`
  );

  for (const m of live) {
    const u1 = assignedUsername({ id: m.p1id, full_name: m.p1name });
    const u2 = assignedUsername({ id: m.p2id, full_name: m.p2name });
    if (username !== u1 && username !== u2) continue;

    const settings = await getSettings();
    return NextResponse.json({
      found: true,
      // action yalnızca eşzamanlı geliş yarışında öncelik belirler; ilk gelen odayı kurar
      action: username === u1 ? "create" : "join",
      room: m.game_id,
      password: m.room_password,
      points: parseInt(settings.tavla_points ?? "3", 10),
      opponent: `Guest_${username === u1 ? u2 : u1}`, // misafir girişlerinde sunucu bu öneki ekler
    });
  }
  return NextResponse.json({ found: false });
}
