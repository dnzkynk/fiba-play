import { currentAdmin } from "@/lib/auth";
import { ensureWatcher } from "@/lib/watcher";
import { AdminLoginForm } from "./ui";
import { AdminTabs } from "./nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const admin = await currentAdmin();
  if (!admin) return <AdminLoginForm />;
  ensureWatcher();
  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}
