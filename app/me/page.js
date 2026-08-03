// Oyuncunun ana ekranı: sıradaki maçı öne çıkar, turnuva ve geçmiş maçları listeler.
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { currentPlayerRows } from "@/lib/auth";
import { getT } from "@/lib/i18n";
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
  const { t, locale } = await getT();
  const me = myRows[0];
  const myIds = myRows.map((r) => r.id);

  const matches = await q(
    `SELECT m.*, t.name AS tname, t.game AS tgame, t.id AS tid,
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

  return (
    <div className="mx-auto max-w-3xl">
      <AutoRefresh seconds={20} />
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("hello")}, {me.full_name.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        {myRows.length > 1 ? t("yourTournaments") : t("yourTournament")}:{" "}
        {myRows.map((r, i) => (
          <span key={r.id} className="font-medium text-stone-700">
            {i > 0 && " · "}{GAME_ICON[r.game]} {t(r.game)} ({r.bracket_size} {t("players")})
          </span>
        ))}
      </p>

      {active.length === 0 && past.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          {t("noDrawYet")}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {active.map((m) => (
          <Card key={m.id} className={m.status === "live" ? "border-amber-300 ring-1 ring-amber-300" : ""}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-stone-500">
                  {GAME_ICON[m.tgame]} {m.tname} · {t("round")} {m.round}
                </span>
                <Badge variant={STATUS_VARIANT[m.status]}>{t(`st_${m.status}`)}</Badge>
              </div>
              <p className="mt-3 text-lg">
                {t("you")} <span className="text-stone-400">{t("vs")}</span>{" "}
                <strong>{m.opponent ?? t("waitingOpponent")}</strong>
              </p>
              {m.status === "scheduled" && m.scheduled_at && (
                <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm">
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
                    className={buttonVariants({ variant: "accent" })}>
                    {t("joinMatch")}
                  </a>
                  <span className="text-xs text-stone-500">{t("joinHint")}</span>
                </div>
              )}
              {m.status === "live" && m.tgame === "tavla" && (
                <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-semibold">{t("tavlaHowTitle")}</p>
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2.5">
                    <div className="text-[11px] uppercase tracking-wide text-amber-700">{t("tavlaUsername")}</div>
                    <code className="font-mono text-sm font-bold">{assignedUsername(myRows.find((r) => r.id === m.p1_id || r.id === m.p2_id) ?? me)}</code>
                    <p className="mt-1 text-[11px] leading-snug text-amber-800">{t("tavlaUsernameHint")}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-stone-400">{t("tavlaRoom")}</div>
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{m.game_id}</code>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-stone-400">{t("tavlaPass")}</div>
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{m.room_password}</code>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-stone-400">{t("tavlaPoints")}</div>
                      <span className="font-medium tabular-nums">{tavlaPoints}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500">
                    {m.i_am_p1 ? t("tavlaCreatorHint") : t("tavlaJoinerHint")} {t("tavlaResultAuto")}
                  </p>
                  <a href={`/play/${m.id}`} target="_blank" rel="noreferrer"
                    className={`mt-3 ${buttonVariants({ variant: "accent", size: "sm" })}`}>
                    {t("tavlaOpenClient")}
                  </a>
                </div>
              )}
              <p className="mt-4 text-xs">
                <a className="font-medium text-indigo-600 hover:text-indigo-800" href={`/t/${m.tid}`}>{t("seeBracket")}</a>
              </p>
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
  );
}
