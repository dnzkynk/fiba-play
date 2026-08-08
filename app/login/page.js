import { redirect } from "next/navigation";
import { isAdmin, currentPlayerEmail } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { PlayerLoginForm } from "./ui";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentPlayerEmail()) redirect("/me");
  if (await isAdmin()) redirect("/admin");
  const { t, lang } = await getT();
  const labels = {
    email: t("email"),
    password: t("password"),
    loginBtn: t("loginBtn"),
    loggingIn: t("loggingIn"),
    loginFailed: t("loginFailed"),
    noPassword: t("noPassword"),
  };
  const bullets = [t("heroBullet1"), t("heroBullet2"), t("heroBullet3")];

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center py-4">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl lg:min-h-[600px] lg:grid-cols-5">

        {/* Marka paneli */}
        <div className="relative hidden flex-col justify-between border-r border-stone-200 bg-white p-10 lg:col-span-3 lg:flex">
          <p className="text-sm font-semibold tracking-wide text-fiba-700">FIBA Holding</p>

          <div className="flex flex-col items-center py-6 text-center">
            <img src="/giris-banner.png" alt="Fiba Tournament" className="w-full max-w-md" />
            <p className="mt-6 max-w-md text-lg font-medium leading-snug text-stone-600 text-balance">
              {t("brandTagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-col gap-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-[13px] text-stone-500">
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fibagreen-500/15 text-[10px] text-fibagreen-700">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-xs text-stone-400">© 2026</p>
          </div>
        </div>

        {/* Form paneli */}
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:col-span-2">
          <img src="/logo.png" alt="Fiba Tournament" className="mb-8 h-20 w-auto self-start object-contain lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">{t("welcomeBack")} 👋</h1>
          <p className="mt-1.5 mb-8 text-sm text-stone-500">{t("loginSub")}</p>
          <PlayerLoginForm labels={labels} />
        </div>
      </div>
    </div>
  );
}
