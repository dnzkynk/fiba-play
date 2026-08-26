import { q } from "./db.js";

export const STATUS_TR = {
  pending: "Bekliyor",
  scheduled: "Randevulu",
  live: "Canlı",
  done: "Bitti",
};

export const T_STATUS_TR = {
  draft: "Taslak",
  drawn: "Kura çekildi",
  running: "Devam ediyor",
  finished: "Tamamlandı",
};

export async function tournamentWithMatches(id) {
  const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [id]);
  if (!t) return null;
  const matches = await q(
    `SELECT m.*, p1.full_name AS p1_name, p1.country AS p1_country,
            p2.full_name AS p2_name, p2.country AS p2_country, w.full_name AS winner_name
     FROM matches m
     LEFT JOIN participants p1 ON p1.id = m.p1_id
     LEFT JOIN participants p2 ON p2.id = m.p2_id
     LEFT JOIN participants w  ON w.id  = m.winner_id
     WHERE m.tournament_id = $1 ORDER BY m.round, m.slot`,
    [id]
  );
  const rounds = [];
  for (const m of matches) {
    (rounds[m.round - 1] ??= []).push(m);
  }
  return { ...t, rounds };
}

export function roundName(roundIdx, totalRounds) {
  const remaining = totalRounds - roundIdx;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Yarı Final";
  if (remaining === 3) return "Çeyrek Final";
  return `Tur ${roundIdx + 1}`;
}
