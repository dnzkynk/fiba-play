import { redirect } from "next/navigation";
import { isAdmin, currentPlayerEmail } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { PlayerLoginForm } from "./ui";
import { brandLogoPath } from "@/lib/brand";

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
  const logo = brandLogoPath();

  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center py-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl lg:grid-cols-2">

        {/* Marka paneli */}
        <div
          className="relative hidden flex-col justify-between bg-indigo-950 p-10 text-white lg:flex"
          style={{
            backgroundImage:
              "repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%), linear-gradient(135deg, #312e81 0%, #1e1b4b 55%, #2e1065 100%)",
            backgroundSize: "56px 56px, 100% 100%",
          }}>
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="" className="h-10 w-auto" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-lg backdrop-blur">♟</span>}
            <span className="text-lg font-bold tracking-tight">
              FIBA {lang === "en" ? "Games" : "Oyunları"} <span className="font-normal text-indigo-300">2026</span>
            </span>
          </div>

          <div>
            <p className="text-3xl font-semibold leading-snug tracking-tight text-balance">
              {t("brandTagline")}
            </p>
            <ul className="mt-8 flex flex-col gap-3.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-indigo-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-400">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-indigo-400">FIBA Holding © 2026</p>
        </div>

        {/* Form paneli */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8 lg:hidden">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-lg text-white">♟</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("welcomeBack")} 👋</h1>
          <p className="mt-1.5 mb-8 text-sm text-stone-500">{t("loginSub")}</p>
          <PlayerLoginForm labels={labels} />
        </div>
      </div>
    </div>
  );
}
