import { q } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { AddParticipantForm, ImportForm, DeleteParticipantButton, ChangePasswordButton } from "../ui";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage() {
  if (!(await isAdmin())) return null;

  // Kişi bazında grupla: aynı e-posta iki oyunda da olabilir
  const people = await q(
    `SELECT email, min(full_name) AS full_name, min(company) AS company, min(password) AS password,
       array_agg(json_build_object('id', p.id, 'game', p.game, 'size', p.bracket_size,
         'reserve', p.is_reserve,
         'assigned', EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
                             WHERE t.game = p.game AND (m.p1_id = p.id OR m.p2_id = p.id))) ORDER BY p.game) AS entries
     FROM participants p GROUP BY email ORDER BY min(full_name)`
  );

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Katılımcı ekle</CardTitle>
            <CardDescription>
              Bir kişiyi iki oyuna birden ekleyebilirsiniz — tek parolayla giriş yapar, iki turnuvasını da aynı ekranda görür.
            </CardDescription>
          </div>
          <a className={buttonVariants({ variant: "outline", size: "sm" })} href="/api/admin/export">
            Parola listesi (CSV)
          </a>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddParticipantForm />
          <ImportForm />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Katılımcılar ({people.length} kişi)</CardTitle>
          <CardDescription>Parolaları katılımcılara siz iletiyorsunuz — CSV indirip İK'ya verebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent>
          {people.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              Henüz katılımcı yok — yukarıdan tek tek ekleyin veya CSV import edin.
            </div>
          ) : (
            <Table>
              <THead>
                <TR><TH>Ad Soyad</TH><TH>E-posta</TH><TH>Şirket</TH><TH>Katıldığı oyunlar</TH><TH>Parola</TH><TH></TH></TR>
              </THead>
              <TBody>
                {people.map((p) => (
                  <TR key={p.email}>
                    <TD className="font-medium">{p.full_name}</TD>
                    <TD className="text-stone-500">{p.email}</TD>
                    <TD className="text-stone-500">{p.company}</TD>
                    <TD>
                      <span className="flex flex-wrap gap-1.5">
                        {p.entries.map((e) => (
                          <Badge key={e.id} variant={e.assigned ? "success" : "secondary"}>
                            {e.game === "chess" ? "♟" : "🎲"} {e.size}{" "}
                            {e.reserve ? "· yedek" : e.assigned ? "· turnuvada" : "· bekliyor"}
                          </Badge>
                        ))}
                      </span>
                    </TD>
                    <TD><code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">{p.password}</code></TD>
                    <TD className="text-right">
                      <span className="flex justify-end gap-1.5">
                        <ChangePasswordButton email={p.email} />
                        {p.entries.filter((e) => !e.assigned).map((e) => (
                          <DeleteParticipantButton key={e.id} id={e.id}
                            label={`${e.game === "chess" ? "♟" : "🎲"} çıkar`} />
                        ))}
                      </span>
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
