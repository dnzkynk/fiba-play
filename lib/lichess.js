// Lichess entegrasyonu: open challenge ile link üretme + oyun bitişini dinleme.
// Token gerekmez; open challenge linklerine hesapsız (anonim) oyuncular da katılabilir.

const LICHESS = "https://lichess.org";

export async function createOpenChallenge({ name, clockLimit = 600, clockIncrement = 5 }) {
  const body = new URLSearchParams({
    "clock.limit": String(clockLimit),
    "clock.increment": String(clockIncrement),
    name,
  });
  const res = await fetch(`${LICHESS}/api/challenge/open`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`Lichess challenge başarısız: ${res.status} ${await res.text()}`);
  const c = await res.json();
  return {
    gameId: c.id,
    gameUrl: c.url,
    whiteUrl: c.urlWhite,
    blackUrl: c.urlBlack,
  };
}

// Oyunun canlı akışına bağlanır; oyun bittiğinde {status, winner} ile döner.
// winner: 'white' | 'black' | null (beraberlik/iptal)
export async function streamGameUntilEnd(gameId, { signal } = {}) {
  const res = await fetch(`${LICHESS}/api/stream/game/${gameId}`, { signal });
  if (!res.ok) throw new Error(`Lichess stream başarısız: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let last = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) last = JSON.parse(line);
    }
  }
  // Akış kapandı: son satırda oyun durumu vardır (bitmişse status mate/resign/... olur)
  return last;
}

// Yedek: oyunun anlık durumunu sorgular (stream koparsa watchdog bunu kullanır).
export async function fetchGameStatus(gameId) {
  const res = await fetch(`${LICHESS}/game/export/${gameId}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null; // oyun henüz başlamadı (linke kimse tıklamadı)
  if (!res.ok) throw new Error(`Lichess export başarısız: ${res.status}`);
  return res.json(); // { status, winner, players, ... }
}

const FINISHED = new Set([
  "mate",
  "resign",
  "outoftime",
  "timeout",
  "draw",
  "stalemate",
  "aborted",
  "nostart",
  "cheat",
  "variantend",
  "unknownfinish",
]);

export function isFinished(status) {
  if (!status) return false;
  const raw = typeof status === "object" ? (status.name ?? status.id ?? "") : String(status);
  const normalized = raw.toLowerCase().replace(/[^a-z]/g, "");
  return FINISHED.has(normalized);
}

