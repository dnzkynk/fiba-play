import "./globals.css";
import { currentAdmin, currentPlayerRows } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { UserMenu, LangSwitcher, NavLink } from "./nav";
import { brandLogoPath } from "@/lib/brand";

export const metadata = {
  title: "FIBA Oyunları — Satranç & Tavla",
  description: "FIBA Holding şirket içi online satranç ve tavla turnuvaları",
};

export default async function RootLayout({ children }) {
  const admin = await currentAdmin();
  const playerRows = await currentPlayerRows();
  const player = playerRows[0] ?? null;
  const { lang, t } = await getT();
  const brand = `FIBA ${lang === "en" ? "Games" : "Oyunları"}`;
  const logo = brandLogoPath();

  return (
    <html lang={lang}>
      <body className="flex min-h-screen flex-col">
        <div className="h-1 w-full bg-linear-to-r from-fiba-600 via-fiba-400 to-fibagreen-500" />
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-8">
            <a href="/" className="flex items-center gap-2.5 no-underline">
              {logo ? (
                <img src={logo} alt={brand} className="h-10 w-auto rounded-lg shadow-sm" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-fiba-600 to-fibagreen-500 text-base text-white shadow-sm">♟</span>
              )}
              <span className="hidden text-[11px] font-semibold text-stone-400 sm:block">2026</span>
            </a>

            <nav className="ml-auto flex items-center gap-1">
              {player && <NavLink href="/me">{t("myMatches")}</NavLink>}
              {admin && <NavLink href="/admin">{t("admin")}</NavLink>}
              {!player && !admin && <NavLink href="/login">{t("login")}</NavLink>}
              <div className="ml-2">
                <LangSwitcher lang={lang} />
              </div>
              {(player || admin) && (
                <UserMenu
                  name={player ? player.full_name : admin.full_name}
                  subtitle={player ? player.email : admin.email}
                  logoutLabel={t("logout")}
                />
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-16 sm:px-8">{children}</main>

        <footer className="border-t border-stone-200 bg-white">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-stone-400 sm:px-8">
            <span>♟ 🎲 {brand} · {t("footerNote")}</span>
            <span>FIBA Holding © 2026</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
