// Genel Bakış: şu an ne oluyor — canlı maçlar, yaklaşan randevular, son sonuçlar.
import { q } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { T_STATUS_TR } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, STATUS_VARIANT } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AutoRefresh } from "@/app/refresh";

export const dynamic = "force-dynamic";

const ICON = { chess: "♟", tavla: "🎲" };

export default async function AdminDashboard() {
  if (!(await isAdmin())) return null;

  const [stats] = await q(
    `SELECT
       (SELECT count(*)::int FROM participants) AS participants,
       (SELECT count(*)::int FROM participants p WHERE NOT EXISTS (
          SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
          WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id))) AS unassigned,
       (SELECT count(*)::int FROM tournaments) AS tournaments,
       (SELECT count(*)::int FROM matches WHERE status = 'live') AS live`
  );

  const live = await q(
    `SELECT m.*, t.name AS tname, t.game, p1.full_name AS p1n, p2.full_name AS p2n
     FROM matches m JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN participants p1 ON p1.id = m.p1_id
     LEFT JOIN participants p2 ON p2.id = m.p2_id
     WHERE m.status = 'live' ORDER BY m.updated_at DESC LIMIT 12`
  );
  const upcoming = await q(
    `SELECT m.*, t.name AS tname, t.game, p1.full_name AS p1n, p2.full_name AS p2n
     FROM matches m JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN participants p1 ON p1.id = m.p1_id
     LEFT JOIN participants p2 ON p2.id = m.p2_id
     WHERE m.status = 'scheduled' AND m.scheduled_at IS NOT NULL
     ORDER BY m.scheduled_at ASC LIMIT 8`
  );
  const recent = await q(
    `SELECT m.*, t.name AS tname, t.game, p1.full_name AS p1n, p2.full_name AS p2n, w.full_name AS wn
     FROM matches m JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN participants p1 ON p1.id = m.p1_id
     LEFT JOIN participants p2 ON p2.id = m.p2_id
     LEFT JOIN participants w ON w.id = m.winner_id
     WHERE m.status = 'done' AND m.result_detail IS DISTINCT FROM 'bye'
     ORDER BY m.updated_at DESC LIMIT 8`
  );
  const tournaments = await q(
    `SELECT t.*,
       count(m.id) FILTER (WHERE m.status = 'done' AND m.winner_id IS NOT NULL)::int AS done_count,
       count(m.id)::int AS total_count
     FROM tournaments t LEFT JOIN matches m ON m.tournament_id = t.id
     GROUP BY t.id ORDER BY t.game, t.bracket_size`
  );

  const tiles = [
    { label: "Katılımcı", value: stats.participants },
    { label: "Kura bekleyen", value: stats.unassigned },
    { label: "Turnuva", value: stats.tournaments },
    { label: "Canlı maç", value: stats.live, hot: stats.live > 0 },
  ];

  return (
    <>
      <AutoRefresh seconds={15} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className={`text-3xl font-semibold tabular-nums tracking-tight ${s.hot ? "text-amber-600" : ""}`}>{s.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>🔴 Canlı maçlar</CardTitle></CardHeader>
          <CardContent>
            {live.length === 0 ? (
              <p className="text-sm text-stone-400">Şu an canlı maç yok.</p>
            ) : (
              <div className="flex flex-col divide-y divide-stone-100">
                {live.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                    <span>{ICON[m.game]}</span>
                    <span className="font-medium">{m.p1n}</span>
                    <span className="text-xs text-stone-400">vs</span>
                    <span className="font-medium">{m.p2n}</span>
                    <span className="text-xs text-stone-400">· Tur {m.round}</span>
                    <span className="ml-auto flex items-center gap-2 text-xs">
                      <span title="katılım">{m.p1_joined_at ? "✅" : "⏳"}{m.p2_joined_at ? "✅" : "⏳"}</span>
                      {m.game === "chess" && m.game_url && m.p1_joined_at && m.p2_joined_at && (
                        <a className="font-medium text-amber-700" href={m.game_url} target="_blank" rel="noreferrer">İzle ↗</a>
                      )}
                      <a className="font-medium text-fiba-600" href={`/admin/t/${m.tournament_id}`}>Yönet →</a>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>🕐 Yaklaşan randevular</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-stone-400">Randevulu maç yok — turnuva detayından program verin.</p>
            ) : (
              <div className="flex flex-col divide-y divide-stone-100">
                {upcoming.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                    <span>{ICON[m.game]}</span>
                    <span className="font-medium">{m.p1n ?? "—"}</span>
                    <span className="text-xs text-stone-400">vs</span>
                    <span className="font-medium">{m.p2n ?? "—"}</span>
                    <span className="ml-auto text-xs tabular-nums text-stone-500">
                      {new Date(m.scheduled_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Turnuva ilerlemesi</CardTitle></CardHeader>
          <CardContent>
            {tournaments.length === 0 ? (
              <p className="text-sm text-stone-400">Henüz turnuva yok — Katılımcılar sekmesinden ekleyip Turnuvalar'dan kura çekin.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {tournaments.map((t) => {
                  const pct = t.total_count ? Math.round((t.done_count / t.total_count) * 100) : 0;
                  return (
                    <a key={t.id} href={`/admin/t/${t.id}`} className="group no-underline">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-stone-800 group-hover:text-fiba-700">{ICON[t.game]} {t.name}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant={STATUS_VARIANT[t.status]}>{T_STATUS_TR[t.status]}</Badge>
                          <span className="text-xs tabular-nums text-stone-500">{t.done_count}/{t.total_count}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-fiba-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Son sonuçlar</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-stone-400">Henüz sonuçlanan maç yok.</p>
            ) : (
              <Table>
                <THead><TR><TH>Maç</TH><TH>Sonuç</TH><TH className="text-right">Ne zaman</TH></TR></THead>
                <TBody>
                  {recent.map((m) => (
                    <TR key={m.id}>
                      <TD>{ICON[m.game]} {m.p1n ?? "—"} <span className="text-stone-400">vs</span> {m.p2n ?? "—"}</TD>
                      <TD>
                        {m.wn
                          ? <span className="font-medium text-emerald-700">{m.wn}</span>
                          : <span className="text-stone-400">{m.result_detail?.startsWith("iptal") ? "İptal" : "Beraberlik"}</span>}
                        {m.result_via === "forfeit" && m.wn && <span className="text-xs text-stone-400"> (hükmen)</span>}
                      </TD>
                      <TD className="text-right text-xs tabular-nums text-stone-400">
                        {new Date(m.updated_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
