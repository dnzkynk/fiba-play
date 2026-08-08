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
     WHERE p.game = $1 AND p.bracket_size = $2 AND NOT p.is_reserve
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
  // Üst tur maçı başladıysa/bittiyse koltuğu değiştirmek yarışı bozar — override reddedilir.
  const [up] = await q(
    "SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 AND slot = $3",
    [m.tournament_id, m.round + 1, Math.floor(m.slot / 2)]
  );
  if (up && (up.status === "done" || up.game_id) && up[col] !== winnerId)
    throw new Error("Üst turdaki maç başlamış/bitmiş — önce onu sıfırlayın");
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
export async function resetMatch(matchId, { swapSeats: swap = false, countRematch = false, keepJoins = false, actor = "otomatik" } = {}) {
  // Kazanan üst tura taşındıysa oradaki koltuk da geri alınır; üst tur maçı
  // başlamış/bitmişse önce o sıfırlanmalı (yanlış oyuncuyla oynanmayı önler).
  const [m] = await q("SELECT * FROM matches WHERE id = $1", [matchId]);
  if (!m) throw new Error("Maç bulunamadı");
  if (m.winner_id) {
    const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [m.tournament_id]);
    if (m.round === Math.log2(t.bracket_size)) {
      await q("UPDATE tournaments SET status = 'running' WHERE id = $1 AND status = 'finished'", [t.id]);
    } else {
      const seat = m.slot % 2 === 0 ? "p1_id" : "p2_id";
      const [up] = await q(
        "SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 AND slot = $3",
        [m.tournament_id, m.round + 1, Math.floor(m.slot / 2)]
      );
      if (up && up[seat] === m.winner_id) {
        if (up.status === "done" || up.game_id)
          throw new Error("Üst turdaki maç başlamış/bitmiş — önce onu sıfırlayın");
        await q(
          `UPDATE matches SET ${seat} = NULL, status = 'pending', updated_at = now() WHERE id = $1`,
          [up.id]
        );
      }
    }
  }
  await q(
    `UPDATE matches SET status = 'scheduled',
     game_id = NULL, game_url = NULL, p1_url = NULL, p2_url = NULL, room_password = NULL,
     p1_joined_at = CASE WHEN $4 THEN (CASE WHEN $3 THEN p2_joined_at ELSE p1_joined_at END) END,
     p2_joined_at = CASE WHEN $4 THEN (CASE WHEN $3 THEN p1_joined_at ELSE p2_joined_at END) END,
     winner_id = NULL, result_via = NULL, result_detail = NULL,
     rematch_count = rematch_count + $2,
     p1_id = CASE WHEN $3 THEN p2_id ELSE p1_id END,
     p2_id = CASE WHEN $3 THEN p1_id ELSE p2_id END,
     updated_at = now() WHERE id = $1`,
    [matchId, countRematch ? 1 : 0, swap, keepJoins]
  );
  await audit("reset", { matchId, swap, countRematch }, actor);
}

// Turnuva programı. İki kullanım:
//  - roundTimes: her tur için ayrı tarih/saat dizisi (şartname: günlere yayılan takvim)
//  - startsAt + intervalHours: 1. tur startsAt'ta, sonraki turlar sabit arayla (eski yol)
// Oynanmamış tüm maçların saatini turuna göre yazar; iki oyuncusu belli olanlar 'scheduled' olur,
// rakibi henüz belli olmayanlar saatli 'pending' kalır (rakip gelince kendiliğinden 'scheduled').
export async function scheduleTournament(tournamentId, startsAtOrTimes, intervalHours, actor = "otomatik") {
  const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [tournamentId]);
  if (!t) throw new Error("Turnuva bulunamadı");
  if (t.status === "finished") throw new Error("Biten turnuva programlanamaz");
  const totalRounds = Math.log2(t.bracket_size);

  let times;
  if (Array.isArray(startsAtOrTimes)) {
    if (startsAtOrTimes.length !== totalRounds)
      throw new Error(`${totalRounds} tur için ${totalRounds} saat girilmeli`);
    times = startsAtOrTimes.map((v, i) => {
      const d = new Date(v);
      if (isNaN(d)) throw new Error(`${i + 1}. tur için geçersiz tarih`);
      return d.toISOString();
    });
    for (let i = 1; i < times.length; i++)
      if (times[i] <= times[i - 1]) throw new Error(`${i + 1}. tur bir önceki turdan sonra olmalı`);
  } else {
    const start = new Date(startsAtOrTimes);
    if (isNaN(start)) throw new Error("Geçersiz başlangıç tarihi");
    const interval = Math.max(1, parseInt(intervalHours, 10) || 24);
    times = Array.from({ length: totalRounds }, (_, i) =>
      new Date(start.getTime() + i * interval * 3600_000).toISOString()
    );
  }

  await q("UPDATE tournaments SET starts_at = $1, round_times = $2 WHERE id = $3", [
    times[0], JSON.stringify(times), tournamentId,
  ]);
  let scheduled = 0;
  for (let r = 1; r <= totalRounds; r++) {
    const updated = await q(
      `UPDATE matches SET scheduled_at = $1,
         status = CASE WHEN p1_id IS NOT NULL AND p2_id IS NOT NULL THEN 'scheduled' ELSE status END,
         updated_at = now()
       WHERE tournament_id = $2 AND round = $3 AND status IN ('pending', 'scheduled') AND game_id IS NULL
       RETURNING id`,
      [times[r - 1], tournamentId, r]
    );
    scheduled += updated.length;
  }
  await audit("schedule_tournament", { tournamentId, times, matches: scheduled }, actor);
  return { scheduled, times };
}

// Oyuncu değişikliği: koltuktaki (oynamamış) asil oyuncunun yerine yedek/beklemedeki
// bir katılımcı atanır. Çıkan kişi yedeğe düşer, giren asil olur (şartname md. 1).
export async function replaceSeat(tournamentId, outId, inId, actor = "otomatik") {
  const [t] = await q("SELECT * FROM tournaments WHERE id = $1", [tournamentId]);
  if (!t) throw new Error("Turnuva bulunamadı");
  const [np] = await q("SELECT * FROM participants WHERE id = $1", [inId]);
  if (!np) throw new Error("Atanacak katılımcı bulunamadı");
  if (np.game !== t.game) throw new Error("Katılımcı bu turnuvanın oyununa kayıtlı değil");
  const already = await q(
    "SELECT 1 FROM matches WHERE tournament_id = $1 AND (p1_id = $2 OR p2_id = $2) LIMIT 1",
    [tournamentId, inId]
  );
  if (already.length) throw new Error("Bu kişi zaten turnuvada");

  const seats = await q(
    `SELECT * FROM matches WHERE tournament_id = $1 AND (p1_id = $2 OR p2_id = $2) AND status <> 'done'`,
    [tournamentId, outId]
  );
  if (!seats.length) throw new Error("Değiştirilecek oynanmamış koltuk yok");
  for (const m of seats) {
    if (m.game_id) throw new Error("Maç başlamış — önce maçı sıfırlayın");
    const col = m.p1_id === outId ? "p1_id" : "p2_id";
    await q(`UPDATE matches SET ${col} = $1, updated_at = now() WHERE id = $2`, [inId, m.id]);
  }
  await q("UPDATE participants SET is_reserve = false WHERE id = $1", [inId]);
  await q("UPDATE participants SET is_reserve = true WHERE id = $1", [outId]);
  await audit("replace_seat", { tournamentId, outId, inId }, actor);
  return { seats: seats.length };
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
