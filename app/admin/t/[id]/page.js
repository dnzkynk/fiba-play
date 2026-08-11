import { notFound } from "next/navigation";
import { LocalTime } from "@/app/timefmt";
import { isAdmin } from "@/lib/auth";
import { tournamentWithMatches, roundName, STATUS_TR, T_STATUS_TR } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, STATUS_VARIANT } from "@/components/ui/badge";
import { MatchControls, SwapForm, TournamentScheduleForm, DeleteTournamentButton, ReplaceForm } from "../../ui";
import { AutoRefresh } from "@/app/refresh";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminTournament({ params }) {
  if (!(await isAdmin())) return null;
  const { id } = await params;
  const t = await tournamentWithMatches(parseInt(id, 10));
  if (!t) notFound();

  // Kura düzeltme: 1. turda oyunu henüz başlamamış maçlardaki oyuncular takas edilebilir
  const swappable = await q(
    `SELECT p.id, p.full_name, p.company FROM matches m
     JOIN participants p ON p.id IN (m.p1_id, m.p2_id)
     WHERE m.tournament_id = $1 AND m.round = 1
       AND m.status IN ('pending', 'scheduled') AND m.game_id IS NULL
     ORDER BY p.full_name`,
    [t.id]
  );

  // Oyuncu değişikliği: oynanmamış koltuktakiler çıkabilir, turnuva dışındakiler (yedekler önde) girebilir
  const seated = await q(
    `SELECT DISTINCT p.id, p.full_name FROM matches m
     JOIN participants p ON p.id IN (m.p1_id, m.p2_id)
     WHERE m.tournament_id = $1 AND m.status <> 'done' AND m.game_id IS NULL
     ORDER BY p.full_name`,
    [t.id]
  );
  const subs = await q(
    `SELECT p.id, p.full_name, p.is_reserve FROM participants p
     WHERE p.game = $1 AND NOT EXISTS (
       SELECT 1 FROM matches m WHERE m.tournament_id = $2 AND (m.p1_id = p.id OR m.p2_id = p.id))
     ORDER BY p.is_reserve DESC, p.full_name`,
    [t.game, t.id]
  );

  return (
    <>
      <AutoRefresh seconds={20} />
      <a className="text-sm text-stone-500 hover:text-stone-900" href="/admin/tournaments">← Turnuvalar</a>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.game === "chess" ? "♟" : "🎲"} {t.name}
        </h1>
        <Badge variant={STATUS_VARIANT[t.status]}>{T_STATUS_TR[t.status]}</Badge>
        <a className="text-sm font-medium text-stone-600 hover:underline" href={`/t/${t.id}`} target="_blank">
          Fikstür görünümü ↗
        </a>
        <span className="ml-auto">
          <DeleteTournamentButton tid={t.id} name={t.name} />
        </span>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Turnuva programı</CardTitle>
          <p className="text-sm text-stone-500">
            Her turun gün ve saatini ayrı ayrı belirleyin (örn. 1.-2. tur aynı gün, final ertesi gün) —
            oynanmamış maçların saatleri otomatik yazılır, saati gelen maçın linki kendiliğinden üretilir.
            Tek maçı aşağıdan ayrıca kaydırabilirsiniz.
          </p>
        </CardHeader>
        <CardContent>
          <TournamentScheduleForm
            tournamentId={t.id}
            rounds={t.rounds.length}
            roundTimes={t.round_times}
            startsAt={t.starts_at?.toISOString?.() ?? t.starts_at}
            intervalHours={t.round_interval_hours}
          />
        </CardContent>
      </Card>

      {seated.length > 0 && subs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Oyuncu değişikliği (yedek atama)</CardTitle>
            <p className="text-sm text-stone-500">
              Katılamayacağını bildiren oyuncunun koltuğuna yedek listeden atama yapar (şartname: turnuvadan
              bir gün öncesine kadar). Çıkan oyuncu yedeğe düşer; oynanmış maçlara dokunulmaz.
            </p>
          </CardHeader>
          <CardContent>
            <ReplaceForm tournamentId={t.id} seated={seated} subs={subs} />
          </CardContent>
        </Card>
      )}

      {swappable.length >= 2 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Kura düzeltme</CardTitle>
            <p className="text-sm text-stone-500">
              Oyunu başlamamış 1. tur maçlarındaki iki oyuncunun yerini değiştirir (örn. aynı şirketten iki kişi eşleşmesin diye).
            </p>
          </CardHeader>
          <CardContent>
            <SwapForm tournamentId={t.id} players={swappable} />
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-col gap-5">
        {t.rounds.map((matches, ri) => {
          const playable = matches.filter((m) => m.p1_id || m.p2_id);
          if (!playable.length) return null;
          return (
            <Card key={ri}>
              <CardHeader className="flex-row items-baseline justify-between">
                <CardTitle>{roundName(ri, t.rounds.length)}</CardTitle>
                {(t.round_times?.[ri] || t.starts_at) && (
                  <span className="text-xs font-medium text-fiba-600">
                    🕐 <LocalTime locale="tr-TR"
                      iso={t.round_times?.[ri] ?? new Date(new Date(t.starts_at).getTime() + ri * t.round_interval_hours * 3600_000).toISOString()} />
                  </span>
                )}
              </CardHeader>
              <CardContent className="divide-y divide-stone-100">
                {playable.map((m) => (
                  <div key={m.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-medium">{m.p1_name ?? "—"}</span>
                      <span className="text-xs text-stone-400">vs</span>
                      <span className="font-medium">{m.p2_name ?? "—"}</span>
                      <Badge variant={STATUS_VARIANT[m.status]}>{STATUS_TR[m.status]}</Badge>
                      {m.scheduled_at && m.status === "scheduled" && (
                        <span className="text-xs text-stone-500">
                          🕐 <LocalTime iso={m.scheduled_at} locale="tr-TR" dateStyle="short" />
                        </span>
                      )}
                      {m.status === "live" && (
                        <span className="text-xs text-stone-500">
                          Katılım: {m.p1_joined_at ? "✅" : "⏳"} {m.p1_name} · {m.p2_joined_at ? "✅" : "⏳"} {m.p2_name}
                          {t.game === "tavla" && m.room_password && (
                            <> · Oda: <code className="rounded bg-stone-100 px-1 py-0.5 font-mono">{m.game_id}</code>{" "}
                            parola <code className="rounded bg-stone-100 px-1 py-0.5 font-mono">{m.room_password}</code></>
                          )}
                        </span>
                      )}
                      {m.rematch_count > 0 && (
                        <Badge variant="info">Rövanş #{m.rematch_count}</Badge>
                      )}
                      {m.status === "done" && (
                        <span className="text-xs text-stone-500">
                          → <strong className="text-stone-800">{m.winner_name ?? "Beraberlik"}</strong>
                          {m.result_detail === "bye" ? " (maçsız)" : m.result_via === "forfeit" ? " (hükmen)" : m.result_detail ? ` (${m.result_detail})` : ""}
                        </span>
                      )}
                    </div>
                    <MatchControls match={m} />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
