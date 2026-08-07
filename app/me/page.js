// Oyuncu ekranı: karşılama bandı + geniş iki kolonlu düzen
// (sol: aktif maçlar + geçmiş, sağ: turnuvalarım / derece / izleme)
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { currentPlayerRows } from "@/lib/auth";
import { getT, tournamentTitle } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, STATUS_VARIANT } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TBody, TR, TD } from "@/components/ui/table";
import { AutoRefresh } from "@/app/refresh";
import { getSettings } from "@/lib/settings";
import { assignedUsername } from "@/lib/bgammon";

export const dynamic = "force-dynamic";

const GAME_ICON = { chess: "♟", tavla: "🎲" };

export default async function MePage() {
  const myRows = await currentPlayerRows();
  if (!myRows.length) redirect("/login");
  const { t, locale, lang } = await getT();
  const me = myRows[0];
  const myIds = myRows.map((r) => r.id);

  const matches = await q(
    `SELECT m.*, t.name AS tname, t.game AS tgame, t.id AS tid,
            t.status AS tstatus, t.bracket_size,
            CASE WHEN m.p1_id = ANY($1) THEN p2.full_name ELSE p1.full_name END AS opponent,
            (m.p1_id = ANY($1)) AS i_am_p1,
            (m.winner_id = ANY($1)) AS i_won
     FROM matches m
     JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN participants p1 ON p1.id = m.p1_id
     LEFT JOIN participants p2 ON p2.id = m.p2_id
     WHERE m.p1_id = ANY($1) OR m.p2_id = ANY($1)
     ORDER BY m.round DESC, m.updated_at DESC`,
    [myIds]
  );

  const active = matches.filter((m) => m.status !== "done");
  const past = matches.filter((m) => m.status === "done");
  const tavlaPoints = (await getSettings()).tavla_points ?? "3";

  const byTournament = new Map();
  for (const m of matches) if (!byTournament.has(m.tid)) byTournament.set(m.tid, m);
  const finalsWon = new Set(
    matches.filter((m) => m.i_won && m.round === Math.log2(m.bracket_size)).map((m) => m.tid)
  );

  // Tek elemede derece, kaybedilen turdan bellidir: finalde kaybeden 2.,
  // yarı finalde elenenler 3.–4., çeyrekte 5.–8. ...
  function placementOf(tid) {
    if (finalsWon.has(tid)) return "1.";
    const mine = matches.filter((m) => m.tid === tid && m.status === "done");
    const lost = mine.filter((m) => (m.winner_id && !m.i_won) || (!m.winner_id && m.result_detail?.startsWith("iptal")));
    if (!lost.length) return null;
    const r = Math.max(...lost.map((m) => m.round));
    const R = Math.log2(lost[0].bracket_size);
    if (r === R) return "2.";
    return `${2 ** (R - r) + 1}.–${2 ** (R - r + 1)}.`;
  }

  return (
    <>
      <AutoRefresh seconds={15} />

      {/* Karşılama bandı */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-r from-fiba-600 via-fiba-800 to-fiba-950 px-6 py-8 text-white shadow-md sm:px-10">
        <div className="pointer-events-none absolute -right-2 -top-8 hidden md:block">
          <img src="/satranc-logo.png" alt="" className="inline-block h-44 w-auto -rotate-6 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
          <img src="/tavla-logo.png" alt="" className="-ml-8 inline-block h-44 w-auto rotate-3 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
        </div>
        <h1 className="relative text-2xl font-bold tracking-tight sm:text-3xl">
          {t("hello")}, {me.full_name.split(" ")[0]} 👋
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...byTournament.values()].map((m) => (
            <span key={m.tid} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
              {GAME_ICON[m.tgame]} {tournamentTitle(t, lang, m.tgame, m.bracket_size)}
              {finalsWon.has(m.tid) && <span>🏆</span>}
            </span>
          ))}
          {byTournament.size === 0 && <span className="text-sm text-fiba-200">{t("noDrawYet")}</span>}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Sol: aktif maçlar + geçmiş */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight">{t("activeMatches")}</h2>
          {active.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              {past.length ? t("opponentTbd") : t("noDrawYet")}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-4">
            {active.map((m) => (
              <Card key={m.id} className={m.status === "live" ? "border-amber-300 ring-1 ring-amber-300" : ""}>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-stone-500">
                      {GAME_ICON[m.tgame]} {tournamentTitle(t, lang, m.tgame, m.bracket_size)} · {t("round")} {m.round}
                    </span>
                    <Badge variant={STATUS_VARIANT[m.status]}>{t(`st_${m.status}`)}</Badge>
                  </div>
                  <p className="mt-3 text-xl">
                    {t("you")} <span className="text-stone-400">{t("vs")}</span>{" "}
                    <strong>{m.opponent ?? t("waitingOpponent")}</strong>
                  </p>
                  {m.status === "scheduled" && m.scheduled_at && (
                    <div className="mt-3 rounded-lg bg-fiba-50 p-3 text-sm">
                      🕐 <strong>{new Date(m.scheduled_at).toLocaleString(locale, { dateStyle: "full", timeStyle: "short" })}</strong>
                      <p className="mt-1 text-xs text-stone-500">{t("scheduleHint")}</p>
                    </div>
                  )}
                  {m.status === "pending" && (
                    <p className="mt-2 text-xs text-stone-500">
                      {m.scheduled_at && (
                        <>🕐 <strong>{new Date(m.scheduled_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</strong> · </>
                      )}
                      {m.opponent ? t("timeTbd") : t("opponentTbd")}
                    </p>
                  )}
                  {m.status === "live" && m.tgame === "chess" && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <a href={`/play/${m.id}`} target="_blank" rel="noreferrer"
                        className={buttonVariants({ variant: "accent", size: "lg" })}>
                        {t("joinMatch")}
                      </a>
                      <span className="text-xs text-stone-500">{t("joinHint")}</span>
                    </div>
                  )}
                  {m.status === "live" && m.tgame === "tavla" && (
                    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <a href={`/play/${m.id}`} target="_blank" rel="noreferrer"
                          className={buttonVariants({ variant: "accent", size: "lg" })}>
                          {t("tavlaOpenClient")}
                        </a>
                        <span className="max-w-72 text-xs text-stone-500">
                          {m.i_am_p1 ? t("tavlaCreatorHint") : t("tavlaJoinerHint")}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
                        {t("tavlaUsername")}: <code className="rounded bg-white px-1 py-0.5 font-mono">{assignedUsername(myRows.find((r) => r.id === m.p1_id || r.id === m.p2_id) ?? me)}</code>
                        {" · "}{t("tavlaRoom")}: <code className="rounded bg-white px-1 py-0.5 font-mono">{m.game_id}</code>
                        {" · "}{t("tavlaPass")}: <code className="rounded bg-white px-1 py-0.5 font-mono">{m.room_password}</code>
                        {" · "}{t("tavlaPoints")}: {tavlaPoints} — {t("tavlaUsernameHint")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {past.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-semibold tracking-tight">{t("pastMatches")}</h2>
              <Card className="mt-3">
                <Table>
                  <TBody>
                    {past.map((m) => (
                      <TR key={m.id}>
                        <TD className="text-stone-500">{GAME_ICON[m.tgame]} {t("round")} {m.round}</TD>
                        <TD className="font-medium">{m.opponent ?? "—"}</TD>
                        <TD className="text-right">
                          {m.result_detail === "bye" ? <Badge variant="secondary">{t("byePass")}</Badge>
                            : m.i_won ? <Badge variant="success">{t("youWon")}</Badge>
                            : m.winner_id ? <Badge variant="destructive">{t("youLost")}</Badge>
                            : m.result_detail?.startsWith("iptal") ? <Badge variant="secondary">{t("cancelled")}</Badge>
                            : <Badge variant="secondary">{t("draw")}</Badge>}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </Card>
            </>
          )}
        </div>

        {/* Sağ: turnuvalarım */}
        <aside className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{t("yourTournaments")}</h2>
          {[...byTournament.values()].map((m) => {
            const champ = finalsWon.has(m.tid);
            const rank = placementOf(m.tid);
            const activeHere = active.some((a) => a.tid === m.tid);
            return (
              <Card key={m.tid} className={champ ? "border-emerald-300 bg-emerald-50/50" : ""}>
                <CardContent className="p-5">
                  <p className="font-semibold">
                    {GAME_ICON[m.tgame]} {tournamentTitle(t, lang, m.tgame, m.bracket_size)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {champ ? (
                      <Badge variant="success">{t("youChampion")}</Badge>
                    ) : (
                      <Badge variant={STATUS_VARIANT[m.tstatus]}>{t(`ts_${m.tstatus}`)}</Badge>
                    )}
                    {rank && !champ && (
                      <Badge variant="secondary">{t("placementLabel")}: {rank}</Badge>
                    )}
                  </div>
                  {!activeHere && !champ && m.tstatus !== "finished" && (
                    <p className="mt-2 text-xs text-stone-500">{t("spectateHint")}</p>
                  )}
                  <a className={`mt-3 w-full ${buttonVariants({ variant: champ ? "default" : "outline", size: "sm" })}`}
                    href={`/t/${m.tid}`}>
                    {t("watchBracket")}
                  </a>
                </CardContent>
              </Card>
            );
          })}
          {byTournament.size === 0 && (
            <p className="text-sm text-stone-400">{t("noDrawYet")}</p>
          )}
        </aside>
      </div>
    </>
  );
}
