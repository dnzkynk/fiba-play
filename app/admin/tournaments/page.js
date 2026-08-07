import { q } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { T_STATUS_TR } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, STATUS_VARIANT } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { GenerateButton } from "../ui";
import { AutoRefresh } from "@/app/refresh";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  if (!(await isAdmin())) return null;

  const tournaments = await q(
    `SELECT t.*,
       count(m.id) FILTER (WHERE m.status = 'live')::int AS live_count,
       count(m.id) FILTER (WHERE m.status = 'done' AND m.winner_id IS NOT NULL)::int AS done_count,
       count(m.id)::int AS total_count,
       (SELECT full_name FROM participants p JOIN matches f ON f.winner_id = p.id
        WHERE f.tournament_id = t.id AND f.round = (SELECT max(round) FROM matches WHERE tournament_id = t.id)
        LIMIT 1) AS champion
     FROM tournaments t LEFT JOIN matches m ON m.tournament_id = t.id
     GROUP BY t.id ORDER BY t.game, t.bracket_size`
  );
  const [waiting] = await q(
    `SELECT count(*)::int AS n FROM participants p WHERE NOT EXISTS (
       SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
       WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id))`
  );

  return (
    <>
      <AutoRefresh seconds={20} />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Turnuvalar</CardTitle>
            <CardDescription>
              {waiting.n > 0
                ? `${waiting.n} katılımcı kura bekliyor — kura çekildiğinde oyun ve turnuva boyuna göre otomatik dağıtılırlar.`
                : "Kura bekleyen katılımcı yok."}
            </CardDescription>
          </div>
          <GenerateButton />
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              Henüz turnuva yok. Önce <a className="font-medium text-fiba-600" href="/admin/participants">Katılımcılar</a> sekmesinden
              kişileri ekleyin, sonra buradan kurayı çekin.
            </div>
          ) : (
            <Table>
              <THead>
                <TR><TH>Turnuva</TH><TH>Durum</TH><TH>İlerleme</TH><TH>Canlı</TH><TH>Şampiyon</TH><TH></TH></TR>
              </THead>
              <TBody>
                {tournaments.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">{t.game === "chess" ? "♟" : "🎲"} {t.name}</TD>
                    <TD><Badge variant={STATUS_VARIANT[t.status]}>{T_STATUS_TR[t.status]}</Badge></TD>
                    <TD className="tabular-nums text-stone-500">{t.done_count}/{t.total_count} maç</TD>
                    <TD>{t.live_count > 0 ? <Badge variant="warning">{t.live_count}</Badge> : <span className="text-stone-300">—</span>}</TD>
                    <TD>{t.champion ? <span className="font-medium text-emerald-700">🏆 {t.champion}</span> : <span className="text-stone-300">—</span>}</TD>
                    <TD className="text-right">
                      <a className="text-sm font-medium text-fiba-600 hover:underline" href={`/admin/t/${t.id}`}>Yönet →</a>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
