// Turnuva motoru: tek eleme fikstürü kurma (bye dahil) ve kazananı ilerletme.
import { q, audit } from "./db.js";

// Fisher-Yates
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Katılımcıları karıştırır, bracket_size'a null (bye) ile tamamlar ve tüm turların
// maç kayıtlarını oluşturur. Tek kişilik maçlar (bye) anında 'done' olur ve kazanan ilerler.
export async function drawTournament(tournamentId, actor = "otomatik") {
  const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [tournamentId]);
  if (!t) throw new Error("Turnuva bulunamadı");
  if (t.status !== "draft") throw new Error("Kura zaten çekilmiş");

  const players = await q(
    `SELECT p.id FROM participants p
     WHERE p.game = $1 AND p.bracket_size = $2
       AND NOT EXISTS (
         SELECT 1 FROM matches m
         JOIN tournaments t2 ON t2.id = m.tournament_id
         WHERE t2.game = $1 AND (m.p1_id = p.id OR m.p2_id = p.id)
       )`,
    [t.game, t.bracket_size]
  );
  if (players.length < 2) throw new Error("Bu turnuva için yeterli katılımcı yok");
  if (players.length > t.bracket_size)
    throw new Error(`Katılımcı sayısı (${players.length}) turnuva boyunu (${t.bracket_size}) aşıyor`);

  // Bye'ları eşit dağıtmak için: karıştır, sonra null'ları araya serpiştir
  const shuffled = shuffle(players.map((p) => p.id));
  const slots = new Array(t.bracket_size).fill(null);
  // Oyuncuları çift indexlere öncelikli yerleştir ki bye'lar farklı maçlara düşsün
  const order = [...Array(t.bracket_size).keys()].sort(
    (a, b) => (a % 2) - (b % 2) || a - b
  );
  shuffled.forEach((pid, i) => (slots[order[i]] = pid));

  const rounds = Math.log2(t.bracket_size);
  for (let r = 1; r <= rounds; r++) {
    const count = t.bracket_size / 2 ** r;
    for (let s = 0; s < count; s++) {
      const p1 = r === 1 ? slots[s * 2] : null;
      const p2 = r === 1 ? slots[s * 2 + 1] : null;
      await q(
        `INSERT INTO matches (tournament_id, round, slot, p1_id, p2_id) VALUES ($1,$2,$3,$4,$5)`,
        [tournamentId, r, s, p1, p2]
      );
    }
  }

  await q("UPDATE tournaments SET status = 'drawn' WHERE id = $1", [tournamentId]);
  await audit("draw", { tournamentId }, actor);

  // Bye maçlarını otomatik sonuçlandır
  const byes = await q(
    `SELECT * FROM matches WHERE tournament_id = $1 AND round = 1
     AND (p1_id IS NULL OR p2_id IS NULL) AND NOT (p1_id IS NULL AND p2_id IS NULL)`,
    [tournamentId]
  );
  for (const m of byes) {
    await recordResult(m.id, m.p1_id ?? m.p2_id, "auto", "bye");
  }
  return { byes: byes.length };
}

// Sonucu yazar ve kazananı bir üst tura taşır. winnerId null => beraberlik/iptal (maç 'live'da kalmaz).
export async function recordResult(matchId, winnerId, via, detail, actor = "otomatik") {
  const [m] = await q("SELECT * FROM matches WHERE id = $1", [matchId]);
  if (!m) throw new Error("Maç bulunamadı");
  if (m.status === "done" && via === "auto") return; // stream + watchdog yarışı: ilk yazan kazanır

  await q(
    `UPDATE matches SET winner_id = $1, result_via = $2, result_detail = $3,
     status = 'done', updated_at = now() WHERE id = $4`,
    [winnerId, via, detail ?? null, matchId]
  );
  await audit("result", { matchId, winnerId, via, detail }, actor);

  if (!winnerId) return; // beraberlik: admin rövanş kurar (maçı resetleyip yeni link üretir)

  const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [m.tournament_id]);
  const finalRound = Math.log2(t.bracket_size);
  if (m.round === finalRound) {
    await q("UPDATE tournaments SET status = 'finished' WHERE id = $1", [t.id]);
    await audit("champion", { tournamentId: t.id, winnerId }, actor);
    return;
  }

  const col = m.slot % 2 === 0 ? "p1_id" : "p2_id";
  await q(
    `UPDATE matches SET ${col} = $1,
     status = CASE WHEN status = 'pending' AND scheduled_at IS NOT NULL
                        AND ${col === "p1_id" ? "p2_id" : "p1_id"} IS NOT NULL
              THEN 'scheduled' ELSE status END,
     updated_at = now()
     WHERE tournament_id = $2 AND round = $3 AND slot = $4`,
    [winnerId, m.tournament_id, m.round + 1, Math.floor(m.slot / 2)]
  );
  await q("UPDATE tournaments SET status = 'running' WHERE id = $1 AND status = 'drawn'", [t.id]);
}

// Maçı sıfırlar (rövanş / kopan oyun): yeni link üretilebilsin diye scheduled'a döner.
export async function resetMatch(matchId, { swapSeats: swap = false, countRematch = false, actor = "otomatik" } = {}) {
  await q(
    `UPDATE matches SET status = 'scheduled',
     game_id = NULL, game_url = NULL, p1_url = NULL, p2_url = NULL, room_password = NULL,
     p1_joined_at = NULL, p2_joined_at = NULL,
     winner_id = NULL, result_via = NULL, result_detail = NULL,
     rematch_count = rematch_count + $2,
     p1_id = CASE WHEN $3 THEN p2_id ELSE p1_id END,
     p2_id = CASE WHEN $3 THEN p1_id ELSE p2_id END,
     updated_at = now() WHERE id = $1`,
    [matchId, countRematch ? 1 : 0, swap]
  );
  await audit("reset", { matchId, swap, countRematch }, actor);
}

// Turnuva programı: 1. tur startsAt'ta, sonraki her tur bir öncekinden intervalHours sonra.
// Oynanmamış tüm maçların saatini turuna göre yazar; iki oyuncusu belli olanlar 'scheduled' olur,
// rakibi henüz belli olmayanlar saatli 'pending' kalır (rakip gelince kendiliğinden 'scheduled').
export async function scheduleTournament(tournamentId, startsAt, intervalHours, actor = "otomatik") {
  const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [tournamentId]);
  if (!t) throw new Error("Turnuva bulunamadı");
  if (t.status === "finished") throw new Error("Biten turnuva programlanamaz");
  const interval = Math.max(1, parseInt(intervalHours, 10) || 24);

  await q("UPDATE tournaments SET starts_at = $1, round_interval_hours = $2 WHERE id = $3", [
    startsAt, interval, tournamentId,
  ]);
  const updated = await q(
    `UPDATE matches SET
       scheduled_at = $1::timestamptz + make_interval(hours => (round - 1) * $2),
       status = CASE WHEN p1_id IS NOT NULL AND p2_id IS NOT NULL THEN 'scheduled' ELSE status END,
       updated_at = now()
     WHERE tournament_id = $3 AND status IN ('pending', 'scheduled') AND game_id IS NULL
     RETURNING id`,
    [startsAt, interval, tournamentId]
  );
  await audit("schedule_tournament", { tournamentId, startsAt, interval, matches: updated.length }, actor);
  return { scheduled: updated.length };
}

// Kura düzeltme: iki katılımcının 1. turdaki koltuklarını takas eder.
// Sadece oyunu başlamamış (pending/scheduled, linki üretilmemiş) maçlarda çalışır.
export async function swapSeats(tournamentId, aId, bId, actor = "otomatik") {
  const seats = await q(
    `SELECT id, p1_id, p2_id, status, game_id FROM matches
     WHERE tournament_id = $1 AND round = 1 AND (p1_id IN ($2, $3) OR p2_id IN ($2, $3))`,
    [tournamentId, aId, bId]
  );
  const seatOf = (pid) => {
    for (const m of seats) {
      if (m.p1_id === pid) return { match: m, col: "p1_id" };
      if (m.p2_id === pid) return { match: m, col: "p2_id" };
    }
    return null;
  };
  const a = seatOf(aId);
  const b = seatOf(bId);
  if (!a || !b) throw new Error("Oyuncu bu turnuvanın 1. turunda bulunamadı");
  for (const s of [a, b]) {
    if (s.match.status === "done" || s.match.game_id)
      throw new Error("Başlamış veya bitmiş (bye dahil) maçtaki oyuncu takas edilemez");
  }
  await q(`UPDATE matches SET ${a.col} = $1, updated_at = now() WHERE id = $2`, [bId, a.match.id]);
  await q(`UPDATE matches SET ${b.col} = $1, updated_at = now() WHERE id = $2`, [aId, b.match.id]);
  await audit("swap", { tournamentId, aId, bId }, actor);
}
