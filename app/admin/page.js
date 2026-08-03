import { q } from "@/lib/db";
import { isAdmin, currentAdmin } from "@/lib/auth";
import { T_STATUS_TR } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, STATUS_VARIANT } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AdminLoginForm, ImportForm, GenerateButton, AddParticipantForm, DeleteParticipantButton, SettingsForm, AdminsManager } from "./ui";
import { ensureWatcher } from "@/lib/watcher";
import { getSettings } from "@/lib/settings";
import { AutoRefresh } from "@/app/refresh";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await currentAdmin();
  if (!me) return <AdminLoginForm />;
  ensureWatcher();
  const admins = await q("SELECT id, full_name, email, password FROM admins ORDER BY id");

  const participants = await q(
    `SELECT p.*, EXISTS (
       SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
       WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id)
     ) AS assigned
     FROM participants p ORDER BY p.game, p.bracket_size, p.full_name`
  );
  const tournaments = await q(
    `SELECT t.*,
       count(m.id) FILTER (WHERE m.status = 'live')::int AS live_count,
       count(m.id) FILTER (WHERE m.status = 'done' AND m.winner_id IS NOT NULL)::int AS done_count,
       count(m.id)::int AS total_count
     FROM tournaments t LEFT JOIN matches m ON m.tournament_id = t.id
     GROUP BY t.id ORDER BY t.game, t.bracket_size`
  );
  const liveTotal = tournaments.reduce((s, t) => s + t.live_count, 0);
  const unassigned = participants.filter((p) => !p.assigned).length;

  const stats = [
    { label: "Katılımcı", value: participants.length },
    { label: "Kura bekleyen", value: unassigned },
    { label: "Turnuva", value: tournaments.length },
    { label: "Canlı maç", value: liveTotal, hot: liveTotal > 0 },
  ];

  const settings = await getSettings();

  return (
    <>
      <AutoRefresh seconds={30} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Yönetim Paneli</h1>
        <div className="flex items-center gap-2">
          <a className={buttonVariants({ variant: "outline", size: "sm" })} href="/api/admin/export">
            Parola listesini indir (CSV)
          </a>
          <a className={buttonVariants({ variant: "ghost", size: "sm" })} href="/admin/audit">
            İşlem geçmişi
          </a>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className={`text-3xl font-semibold tabular-nums tracking-tight ${s.hot ? "text-amber-600" : ""}`}>
                {s.value}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Turnuvalar</CardTitle>
            <CardDescription>Kura çekilince katılımcılar boy ve oyuna göre dağıtılır.</CardDescription>
          </div>
          <GenerateButton />
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              Henüz turnuva yok. Katılımcıları ekledikten sonra kurayı çekin.
            </div>
          ) : (
            <Table>
              <THead>
                <TR><TH>Turnuva</TH><TH>Durum</TH><TH>İlerleme</TH><TH>Canlı</TH><TH></TH></TR>
              </THead>
              <TBody>
                {tournaments.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">{t.game === "chess" ? "♟" : "🎲"} {t.name}</TD>
                    <TD><Badge variant={STATUS_VARIANT[t.status]}>{T_STATUS_TR[t.status]}</Badge></TD>
                    <TD className="tabular-nums text-stone-500">{t.done_count}/{t.total_count} maç</TD>
                    <TD>{t.live_count > 0 ? <Badge variant="warning">{t.live_count} canlı</Badge> : <span className="text-stone-400">—</span>}</TD>
                    <TD className="text-right">
                      <a className="text-sm font-medium text-indigo-600 hover:underline" href={`/admin/t/${t.id}`}>Yönet →</a>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Yöneticiler</CardTitle>
          <CardDescription>
            Her yöneticinin kendi hesabı vardır; işlem geçmişinde kim ne yaptı görünür. Kendinizi ve son yöneticiyi silemezsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminsManager admins={admins} myId={me.id} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Turnuva ayarları</CardTitle>
          <CardDescription>
            Yeni başlatılan maçlara uygulanır (örn. 600+5 = 10 dk + hamle başına 5 sn). Tavla puanı oda talimatlarında gösterilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initial={settings} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Katılımcı ekle</CardTitle>
          <CardDescription>
            Hesaplar sadece buradan açılır; parola otomatik üretilir ve katılımcıya sizin iletmeniz gerekir.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddParticipantForm />
          <ImportForm />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Katılımcılar ({participants.length})</CardTitle>
          <CardDescription>Aynı kişi iki oyuna da kayıtlıysa tek parolayla giriş yapar.</CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              Henüz katılımcı yok — yukarıdan ekleyin.
            </div>
          ) : (
            <Table>
              <THead>
                <TR><TH>Ad Soyad</TH><TH>E-posta</TH><TH>Şirket</TH><TH>Oyun</TH><TH>Boy</TH><TH>Parola</TH><TH>Durum</TH><TH></TH></TR>
              </THead>
              <TBody>
                {participants.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.full_name}</TD>
                    <TD className="text-stone-500">{p.email}</TD>
                    <TD className="text-stone-500">{p.company}</TD>
                    <TD>{p.game === "chess" ? "♟ Satranç" : "🎲 Tavla"}</TD>
                    <TD className="tabular-nums">{p.bracket_size}</TD>
                    <TD><code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">{p.password}</code></TD>
                    <TD>{p.assigned ? <Badge variant="success">Turnuvada</Badge> : <Badge variant="secondary">Bekliyor</Badge>}</TD>
                    <TD className="text-right">{!p.assigned && <DeleteParticipantButton id={p.id} />}</TD>
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
