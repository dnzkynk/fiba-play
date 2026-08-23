// Maç bildirimleri: kura/program sonrası "maçın belli oldu", maç başlayınca "hemen katıl".
// Ayarlardan açılıp kapatılabilir (notify_schedule / notify_live).
import { q } from "./db.js";
import { sendMail, mailEnabled } from "./mail.js";
import { matchScheduledMail, matchLiveMail } from "./mailtemplates.js";
import { getSettings } from "./settings.js";

const fmt = (d, locale, tz) =>
  d ? new Date(d).toLocaleString(locale, { dateStyle: "full", timeStyle: "short", timeZone: tz }) : "—";

function roundName(round, total, lang = "tr") {
  const left = total - round + 1;
  if (lang === "en") return left === 1 ? "Final" : left === 2 ? "Semi-final" : left === 3 ? "Quarter-final" : `Round ${round}`;
  return left === 1 ? "Final" : left === 2 ? "Yarı final" : left === 3 ? "Çeyrek final" : `${round}. Tur`;
}

// Bir turnuvadaki, saati belli ve oyuncuları belli maçlar için "maçın belli oldu" e-postası
export async function notifyScheduled(tournamentId) {
  if (!mailEnabled) return { sent: 0 };
  const s = await getSettings();
  if ((s.notify_schedule ?? "1") !== "1") return { sent: 0, off: true };

  const rows = await q(
    `SELECT m.round, m.scheduled_at, t.bracket_size,
            p1.full_name AS n1, p1.email AS e1, p2.full_name AS n2, p2.email AS e2
     FROM matches m JOIN tournaments t ON t.id = m.tournament_id
     JOIN participants p1 ON p1.id = m.p1_id
     JOIN participants p2 ON p2.id = m.p2_id
     WHERE m.tournament_id = $1 AND m.status IN ('scheduled','pending') AND m.scheduled_at IS NOT NULL`,
    [tournamentId]
  );
  let sent = 0;
  for (const m of rows) {
    const total = Math.log2(m.bracket_size);
    for (const [name, email, opp] of [[m.n1, m.e1, m.n2], [m.n2, m.e2, m.n1]]) {
      const { subject, html } = matchScheduledMail({
        name: name.split(" ")[0],
        opponent: opp,
        roundLabel: roundName(m.round, total, "en"),
        timeText: fmt(m.scheduled_at, "en-GB", "Europe/Istanbul") + " (Istanbul time)",
      });
      const r = await sendMail({ to: email, subject, html });
      if (r.sent) sent++;
    }
  }
  return { sent };
}

// Maç canlıya geçtiğinde iki oyuncuya "hemen katıl"
export async function notifyMatchLive(matchId) {
  if (!mailEnabled) return { sent: 0 };
  const s = await getSettings();
  if ((s.notify_live ?? "1") !== "1") return { sent: 0, off: true };
  const minutes = parseInt(s.no_show_minutes ?? "10", 10);

  const [m] = await q(
    `SELECT p1.full_name AS n1, p1.email AS e1, p2.full_name AS n2, p2.email AS e2
     FROM matches m JOIN participants p1 ON p1.id = m.p1_id JOIN participants p2 ON p2.id = m.p2_id
     WHERE m.id = $1`,
    [matchId]
  );
  if (!m) return { sent: 0 };
  let sent = 0;
  for (const [name, email, opp] of [[m.n1, m.e1, m.n2], [m.n2, m.e2, m.n1]]) {
    const { subject, html } = matchLiveMail({ name: name.split(" ")[0], opponent: opp, minutes });
    const r = await sendMail({ to: email, subject, html });
    if (r.sent) sent++;
  }
  return { sent };
}
