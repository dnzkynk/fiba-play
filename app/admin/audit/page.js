import { q } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const ACTION_TR = {
  import: "Toplu import",
  participant_add: "Katılımcı eklendi",
  participant_delete: "Katılımcı silindi",
  generate: "Turnuvalar oluşturuldu",
  draw: "Kura çekildi",
  swap: "Kura takası",
  schedule: "Randevu verildi",
  result: "Sonuç işlendi",
  reset: "Maç sıfırlandı",
  champion: "Şampiyon belli oldu",
  settings: "Ayar değişti",
  export_passwords: "Parola listesi indirildi",
  auto_rematch_draw: "Beraberlik — otomatik rövanş",
  auto_reset_aborted: "İptal edilen oyun yenilendi",
  bgammon_webhook: "Tavla sonucu (otomatik)",
  admin_login: "Yönetici girişi",
  admin_add: "Yönetici eklendi",
  admin_delete: "Yönetici silindi",
};

export default async function AuditPage() {
  if (!(await isAdmin())) return null;
  const rows = await q("SELECT * FROM audit_log ORDER BY id DESC LIMIT 200");

  return (
    <>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">İşlem geçmişi</h1>
      <p className="mt-1 text-sm text-stone-500">Son 200 kayıt — kura, sonuç ve yönetici müdahalelerinin tamamı.</p>
      <Card className="mt-5">
        <Table>
          <THead>
            <TR><TH>Zaman</TH><TH>Kim</TH><TH>İşlem</TH><TH>Detay</TH></TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="whitespace-nowrap tabular-nums text-stone-500">
                  {new Date(r.created_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "medium" })}
                </TD>
                <TD className={r.actor === "otomatik" ? "text-stone-400" : "text-indigo-700"}>{r.actor}</TD>
                <TD className="font-medium">{ACTION_TR[r.action] ?? r.action}</TD>
                <TD><code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">{JSON.stringify(r.detail)}</code></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
