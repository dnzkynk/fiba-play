// Başvuru listesi: siteden gelen başvuruları asil/yedek katılımcıya çevirme.
import { q } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { LocalTime } from "@/app/timefmt";
import { ApplicationActions } from "./ui";
import { decryptPassword } from "@/lib/crypto";

export const dynamic = "force-dynamic";

const STATUS = {
  new: { label: "Bekliyor", variant: "secondary" },
  approved: { label: "Asil", variant: "success" },
  reserve: { label: "Yedek", variant: "warning" },
};

export default async function ApplicationsPage() {
  if (!(await isAdmin())) return null;
  const rows = await q("SELECT * FROM applications ORDER BY created_at DESC");
  const bekleyen = rows.filter((r) => r.status === "new").length;
  // Onay sırasında atanabilecek turnuvalar (henüz kura çekilmemiş)
  const draftTournaments = await q(
    "SELECT id, name FROM tournaments WHERE status = 'draft' ORDER BY created_at DESC"
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Başvurular ({rows.length} — {bekleyen} bekliyor)</CardTitle>
          <CardDescription>
            Siteden gelen başvurular. "Asil yap" katılımcı hesabı açar (kuraya girer),
            "Yedek yap" yedek listesine alır. Şirket temsiliyeti kuralını burada gözetebilirsiniz.
            Başvuru adresi: <code className="rounded bg-stone-100 px-1">/apply</code>
          </CardDescription>
        </div>
        <a className={buttonVariants({ variant: "outline", size: "sm" })} href="/api/admin/applications/export">
          CSV indir
        </a>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
            Henüz başvuru yok. Duyuru metnindeki bağlantı katılımcıları <code>/apply</code> sayfasına yönlendirmeli.
          </div>
        ) : (
          <Table>
            <THead>
              <TR><TH>Ad Soyad</TH><TH>E-posta</TH><TH>Telefon</TH><TH>Ülke</TH><TH>Şirket</TH><TH>Parola</TH><TH>Tarih</TH><TH>Durum</TH><TH></TH></TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.full_name}</TD>
                  <TD className="text-stone-500">{r.email}</TD>
                  <TD className="text-stone-500">{r.phone}</TD>
                  <TD>{r.country}</TD>
                  <TD>{r.company}</TD>
                  <TD>{r.password
                    ? <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">{decryptPassword(r.password)}</code>
                    : <span className="text-xs text-stone-400">otomatik</span>}</TD>
                  <TD className="text-stone-500"><LocalTime iso={r.created_at} locale="tr-TR" dateStyle="short" /></TD>
                  <TD><Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge></TD>
                  <TD className="text-right"><ApplicationActions id={r.id} status={r.status} tournaments={draftTournaments} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
