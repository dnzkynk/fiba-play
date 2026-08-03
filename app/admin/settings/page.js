import { q } from "@/lib/db";
import { isAdmin, currentAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsForm, AdminsManager } from "../ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await currentAdmin();
  if (!me) return null;
  const settings = await getSettings();
  const admins = await q("SELECT id, full_name, email, password FROM admins ORDER BY id");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Oyun ayarları</CardTitle>
          <CardDescription>
            Bu ayarlar bundan sonra başlatılan maçlara uygulanır; başlamış maçları etkilemez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initial={settings} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Yöneticiler</CardTitle>
          <CardDescription>
            Her yöneticinin kendi hesabı vardır; İşlem Geçmişi'nde kim ne yaptı görünür. Kendinizi ve son yöneticiyi silemezsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminsManager admins={admins} myId={me.id} />
        </CardContent>
      </Card>
    </>
  );
}
