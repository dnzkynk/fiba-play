// Fikstür ekranı: sadece o turnuvanın katılımcıları ve adminler görebilir.
import { notFound, redirect } from "next/navigation";
import { q } from "@/lib/db";
import { isAdmin, currentPlayerRows } from "@/lib/auth";
import { tournamentWithMatches } from "@/lib/queries";
import { getT, roundLabel, tournamentTitle } from "@/lib/i18n";
import { Badge, STATUS_VARIANT } from "@/components/ui/badge";
import { AutoRefresh } from "@/app/refresh";

export const dynamic = "force-dynamic";

export default async function TournamentPage({ params }) {
  const { id } = await params;
  const tid = parseInt(id, 10);

  const admin = await isAdmin();
  if (!admin) {
    const myRows = await currentPlayerRows();
    if (!myRows.length) redirect("/login");
    const myIds = myRows.map((r) => r.id);
    const mine = await q(
      "SELECT 1 FROM matches WHERE tournament_id = $1 AND (p1_id = ANY($2) OR p2_id = ANY($2)) LIMIT 1",
      [tid, myIds]
    );
    if (!mine.length) redirect("/me");
  }

  const t = await tournamentWithMatches(tid);
  if (!t) notFound();
  const { t: tr, locale, lang } = await getT();

  const [champion] = await q(
    `SELECT p.full_name FROM matches m JOIN participants p ON p.id = m.winner_id
     WHERE m.tournament_id = $1 AND m.round = $2`,
    [tid, t.rounds.length]
  );

  function PlayerRow({ name, isWinner, decided }) {
    return (
      <div className={`flex items-center justify-between px-3.5 py-2.5 text-sm ${
        !decided ? "" : isWinner ? "bg-emerald-50 font-semibold text-emerald-800" : "text-stone-400"
      }`}>
        <span className="truncate">{name ?? "—"}</span>
        {isWinner && <span className="text-emerald-600">✓</span>}
      </div>
    );
  }

  return (
    <>
      <AutoRefresh seconds={20} />
      <img src="/ust-banner.png" alt="Fiba Tournament" className="w-full rounded-2xl shadow-sm" />
      <section className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {t.game === "chess" ? "♟" : "🎲"} {tournamentTitle(tr, lang, t.game, t.bracket_size)}
        </h1>
        <Badge variant={STATUS_VARIANT[t.status]}>{tr(`ts_${t.status}`)}</Badge>
        {champion && <Badge variant="success">🏆 {tr("champion")}: {champion.full_name}</Badge>}
      </section>

      <div className="mt-6 flex gap-8 overflow-x-auto pb-6">
        {t.rounds.map((matches, ri) => (
          <div key={ri} className="flex min-w-60 flex-col justify-around gap-4">
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              {roundLabel(tr, ri, t.rounds.length)}
            </p>
            {matches.map((m) => (
              <div key={m.id}
                className={`overflow-hidden rounded-lg border bg-white shadow-sm ${
                  m.status === "live" ? "border-amber-400 ring-1 ring-amber-400" : "border-stone-200"
                }`}>
                <PlayerRow name={m.p1_name} isWinner={m.winner_id === m.p1_id} decided={!!m.winner_id} />
                <div className="border-t border-stone-100" />
                <PlayerRow name={m.p2_name} isWinner={m.winner_id === m.p2_id} decided={!!m.winner_id} />
                <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50 px-3 py-1.5 text-[11px] text-stone-500">
                  <Badge variant={STATUS_VARIANT[m.status]} className="text-[10px]">{tr(`st_${m.status}`)}</Badge>
                  {m.status === "live" && m.game_url && t.game === "chess" && m.p1_joined_at && m.p2_joined_at && (
                    <a className="font-medium text-amber-700 hover:underline" href={m.game_url} target="_blank" rel="noreferrer">
                      {tr("watchLive")}
                    </a>
                  )}
                  {m.status === "done" && m.result_detail === "bye" && <span>{tr("byePass")}</span>}
                  {m.status === "done" && m.result_via === "forfeit" && (
                    <span>{m.winner_id ? tr("forfeit") : tr("cancelled")}</span>
                  )}
                  {m.status === "scheduled" && m.scheduled_at && (
                    <span>🕐 {new Date(m.scheduled_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
