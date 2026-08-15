// "Turnuvaları oluştur": henüz bir turnuvaya dağıtılmamış katılımcıları
// (oyun, boy) gruplarına ayırır, her grup için turnuva açar ve kurayı çeker.
import { NextResponse } from "next/server";
import { q, audit } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { drawTournament } from "@/lib/engine";
import { TAVLA_ENABLED } from "@/lib/features";

const GAME_LABEL = { chess: "Satranç", tavla: "Tavla" };

export async function POST() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const groups = await q(
    `SELECT p.game, p.bracket_size, count(*)::int AS n FROM participants p
     WHERE NOT p.is_reserve AND NOT EXISTS (
       SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
       WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id)
     )
     GROUP BY p.game, p.bracket_size ORDER BY p.game, p.bracket_size`
  );

  const created = [];
  for (const gr of groups) {
    if (gr.n < 2) continue;
    if (gr.game === "tavla" && !TAVLA_ENABLED) continue;
    const name = `Fiba Games 2026 ${GAME_LABEL[gr.game]} — ${gr.bracket_size} kişilik`;
    const [t] = await q(
      `INSERT INTO tournaments (name, game, bracket_size) VALUES ($1,$2,$3) RETURNING *`,
      [name, gr.game, gr.bracket_size]
    );
    const { byes } = await drawTournament(t.id, admin.email);
    created.push({ id: t.id, name, participants: gr.n, byes });
  }

  await audit("generate", { created }, admin.email);
  return NextResponse.json({ created });
}
