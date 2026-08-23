// Arka plan izleyici (in-process):
// 1) Saati gelen 'scheduled' maçlar için oyun/oda kurar (status -> live)
// 2) 'live' satranç maçlarının bitişini stream'den dinler, koparsa polling'le yakalar
// 3) Beraberlikte renkleri değiştirip otomatik rövanş kurar (en fazla 2)
// 4) 1 saatlik pencere dolunca gelen tarafa hükmen verir
// Next.js dev/prod'da tek instance varsayımıyla global singleton olarak çalışır.
import crypto from "node:crypto";
import { q, audit } from "./db.js";
import { createOpenChallenge, streamGameUntilEnd, fetchGameStatus, isFinished } from "./lichess.js";
import { recordResult, resetMatch } from "./engine.js";
import { getSettings } from "./settings.js";
import { notifyMatchLive } from "./notify.js";

const g = globalThis;
const MAX_REMATCHES = 2;

async function finishChessMatch(matchId, game) {
  const [m] = await q("SELECT * FROM matches WHERE id = $1", [matchId]);
  if (!m || m.status === "done") return;
  const rawStatus = typeof game.status === "object" ? (game.status?.name ?? game.status?.id ?? "") : String(game.status ?? "");
  const status = rawStatus.toLowerCase().replace(/[^a-z]/g, "");

  if (status === "aborted" || status === "nostart") {
    // Oyun daha başlamadan iptal edildi (örn. yanlışlıkla abort) — yeni link üret.
    // Katılım izleri korunur ki hükmen penceresi dolduğunda gelen taraf hakkını kaybetmesin.
    await resetMatch(matchId, { keepJoins: true });
    await audit("auto_reset_aborted", { matchId });
    // Oyuncuların kilitlenmemesi için hemen yeni Lichess linki üret
    await startMatch(matchId).catch((e) => console.error("yeni maç başlatılamadı:", e.message));
    return;
  }

  const rawWinner = typeof game.winner === "object" ? (game.winner?.name ?? game.winner?.id ?? "") : String(game.winner ?? "");
  const winner = rawWinner.toLowerCase().trim();

  if (!winner || winner === "null" || winner === "undefined") {
    // Beraberlik veya süresi bitip yetersiz taştan berabere sayılma: renkler değişir, otomatik rövanş — üst üste MAX_REMATCHES'e kadar
    if (m.rematch_count < MAX_REMATCHES) {
      await resetMatch(matchId, { swapSeats: true, countRematch: true, keepJoins: true });
      await audit("auto_rematch_draw", { matchId, n: m.rematch_count + 1 });
      await startMatch(matchId).catch((e) => console.error("rövanş kurulamadı:", e.message));
      return;
    }
    await recordResult(matchId, null, "auto", `draw x${m.rematch_count + 1} — admin kararı bekliyor`);
    return;
  }

  const winnerId = winner === "white" ? m.p1_id : m.p2_id;
  await recordResult(matchId, winnerId, "auto", rawStatus || status || "finished");
}

function watchMatch(match) {
  if (g.__watching.has(match.id)) return;
  g.__watching.add(match.id);
  (async () => {
    try {
      const last = await streamGameUntilEnd(match.game_id);
      const rawStatus = typeof last?.status === "object" ? (last.status?.name ?? last.status?.id ?? "") : String(last?.status ?? "");
      if (rawStatus && isFinished(rawStatus)) {
        await finishChessMatch(match.id, { status: rawStatus, winner: last.winner ?? null });
        return;
      }
      // Akış bitti ama oyun bitmemiş görünüyor: watchdog devralır
    } catch (err) {
      // 404 normaldir: open challenge kabul edilene kadar stream açılmaz; watchdog takip eder
      if (!err.message.includes("404")) console.error(`stream hata (maç ${match.id}):`, err.message);
    } finally {
      g.__watching.delete(match.id);
    }
  })();
}

export async function checkMatchStatus(matchId) {
  const [m] = await q(
    `SELECT m.*, t.game FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     WHERE m.id = $1`,
    [matchId]
  );
  if (!m) throw new Error("Maç bulunamadı");
  if (m.status !== "live") return m;
  if (m.game === "chess" && m.game_id) {
    const game = await fetchGameStatus(m.game_id).catch(() => null);
    if (game && isFinished(game.status)) {
      await finishChessMatch(m.id, game);
      const [updated] = await q("SELECT * FROM matches WHERE id = $1", [matchId]);
      return updated;
    }
  }
  return m;
}

export async function startMatch(matchId) {
  const [m] = await q(
    `SELECT m.*, t.game, t.name AS tname FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = $1`,
    [matchId]
  );
  if (!m) throw new Error("Maç bulunamadı");
  if (!m.p1_id || !m.p2_id) throw new Error("İki oyuncu da belli olmadan maç başlatılamaz");
  if (m.game_id) return m; // idempotent: link zaten üretilmiş
  const settings = await getSettings();

  if (m.game === "chess") {
    const c = await createOpenChallenge({
      name: `${m.tname} — Tur ${m.round}`,
      clockLimit: parseInt(settings.chess_clock_limit ?? "600", 10),
      clockIncrement: parseInt(settings.chess_clock_increment ?? "5", 10),
    });
    const [updated] = await q(
      `UPDATE matches SET status = 'live', game_id = $1, game_url = $2,
       p1_url = $3, p2_url = $4, updated_at = now() WHERE id = $5 RETURNING *`,
      [c.gameId, c.gameUrl, c.whiteUrl, c.blackUrl, matchId]
    );
    watchMatch(updated);
    // "Maçın başladı, hemen katıl" bildirimi (e-posta kapalıysa sessizce atlanır)
    notifyMatchLive(matchId).catch((e) => console.error("bildirim hatası:", e.message));
    return updated;
  }

  // Tavla: bgammon'da özel oda adı + parolası üretilir; oyuncular istemciden bu odayı kurar/katılır.
  // Sonuç, bgammon sunucusundaki webhook'tan (/api/bgammon/webhook) otomatik düşer.
  const room = `fiba-${m.tournament_id}-${matchId}`;
  const roomPass = String(crypto.randomInt(1000, 9999));
  const clientUrl = process.env.BGAMMON_CLIENT_URL || "https://bgammon.org";
  const [updated] = await q(
    `UPDATE matches SET status = 'live', game_id = $1, game_url = $2,
     p1_url = $2, p2_url = $2, room_password = $3, updated_at = now() WHERE id = $4 RETURNING *`,
    [room, clientUrl, roomPass, matchId]
  );
  return updated;
}

async function tick() {
  const st = g.__watcherState;
  if (st) { st.ticks++; st.lastTickAt = new Date().toISOString(); }
  try {
    // Saati gelmiş maçları başlat (iki oyuncusu da belli olanlar)
    const due = await q(
      `SELECT m.id FROM matches m WHERE m.status = 'scheduled'
       AND m.scheduled_at IS NOT NULL AND m.scheduled_at <= now()
       AND m.p1_id IS NOT NULL AND m.p2_id IS NOT NULL`
    );
    for (const d of due) {
      try { await startMatch(d.id); } catch (e) { console.error("başlatma hatası:", e.message); }
    }

    // Watchdog: live satranç maçlarının durumunu sorgula, stream kaçırdıysa yakala
    const live = await q(
      `SELECT m.* FROM matches m JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.status = 'live' AND t.game = 'chess' AND m.game_id IS NOT NULL`
    );
    for (const m of live) {
      const game = await fetchGameStatus(m.game_id).catch(() => null);
      if (game && isFinished(game.status)) {
        await finishChessMatch(m.id, game);
        continue;
      }
      // Lichess open challenge ~24 saatte kabul edilmezse silinir; oyun hiç başlamadan
      // link öldüyse maçı sıfırla — saati geçmişse bir sonraki tick yeni link üretir.
      if (!game && Date.now() - new Date(m.updated_at).getTime() > 24 * 3600_000) {
        await resetMatch(m.id, { keepJoins: true });
        await audit("auto_reset_expired", { matchId: m.id });
        continue;
      }
      if (!g.__watching.has(m.id)) watchMatch(m); // restart sonrası stream'i yeniden kur
    }

    // No-show: hükmen penceresi (ayarlardan, şartname gereği 10 dk) doldu,
    // oyun hâlâ başlamadıysa gelen taraf hükmen kazanır. Pencere, randevu saatiyle
    // fiili başlatma anından ERKEN olanına demirlenir — maç randevudan önce elle
    // başlatıldığında randevuyu bekleyip kilitlenmesin.
    const noShowMin = Math.max(1, parseInt((await getSettings()).no_show_minutes ?? "10", 10));
    const expired = await q(
      `SELECT m.*, t.game AS tgame FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.status = 'live'
         AND LEAST(COALESCE(m.scheduled_at, m.updated_at), m.updated_at) + make_interval(mins => $1) <= now()`,
      [noShowMin]
    );
    for (const m of expired) {
      if (m.tgame === "chess" && m.game_id) {
        // Oyun gerçekten başladıysa (iki taraf da geldi) sonuca karışma
        const game = await fetchGameStatus(m.game_id).catch(() => null);
        if (game && game.status !== "created") continue;
      }
      const p1Came = !!m.p1_joined_at;
      const p2Came = !!m.p2_joined_at;
      if (p1Came !== p2Came) {
        await recordResult(m.id, p1Came ? m.p1_id : m.p2_id, "forfeit", "no-show");
      } else if (!p1Came && !p2Came) {
        // İki taraf da gelmedi: maç iptal (kazanan yok); üst turda rakibi bye geçer
        await recordResult(m.id, null, "forfeit", "iptal — iki taraf da katılmadı");
      }
      // İkisi de gelip oynamadıysa (oyun başladı ama bitmedi) karar admin'de kalır
    }

    // İptal yayılımı: rakibinin geleceği maç iptal olduysa, mevcut oyuncu üst tura bye geçer.
    // İki besleyen maç da iptal olduysa üst tur maçı da iptal olur.
    const orphans = await q(
      `SELECT m.*, f1.winner_id AS f1w, f1.status AS f1s, f2.winner_id AS f2w, f2.status AS f2s
       FROM matches m
       LEFT JOIN matches f1 ON f1.tournament_id = m.tournament_id AND f1.round = m.round - 1 AND f1.slot = m.slot * 2
       LEFT JOIN matches f2 ON f2.tournament_id = m.tournament_id AND f2.round = m.round - 1 AND f2.slot = m.slot * 2 + 1
       WHERE m.status IN ('pending', 'scheduled') AND m.round > 1
         AND ((m.p1_id IS NULL AND f1.status = 'done' AND f1.winner_id IS NULL)
           OR (m.p2_id IS NULL AND f2.status = 'done' AND f2.winner_id IS NULL))`
    );
    for (const m of orphans) {
      const p1Dead = !m.p1_id && m.f1s === "done" && !m.f1w;
      const p2Dead = !m.p2_id && m.f2s === "done" && !m.f2w;
      if (p1Dead && p2Dead) {
        await recordResult(m.id, null, "forfeit", "iptal — iki taraf da katılmadı");
      } else if (p1Dead && m.p2_id) {
        await recordResult(m.id, m.p2_id, "auto", "bye (rakip maçı iptal)");
      } else if (p2Dead && m.p1_id) {
        await recordResult(m.id, m.p1_id, "auto", "bye (rakip maçı iptal)");
      }
      // Tek taraf iptal ama diğer taraf henüz belli değilse: diğer besleyen bitince bu kural yine yakalar
    }
  } catch (err) {
    if (g.__watcherState) g.__watcherState.lastError = `${new Date().toISOString()} ${err.message}`;
    console.error("watcher tick hatası:", err.message);
  }
}

export function watcherState() {
  return g.__watcherState ?? null;
}

export function ensureWatcher() {
  if (g.__watcherStarted) return;
  g.__watcherStarted = true;
  g.__watching = new Set();
  g.__watcherState = { startedAt: new Date().toISOString(), ticks: 0, lastTickAt: null, lastError: null };
  tick();
  if (g.__watcherInterval) clearInterval(g.__watcherInterval);
  g.__watcherInterval = setInterval(tick, 5_000);
  console.log("⏱  turnuva izleyicisi başladı (5 sn tick)");
}
