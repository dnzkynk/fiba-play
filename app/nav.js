"use client";
import { useRouter, usePathname } from "next/navigation";

export function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <a href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
      }`}>
      {children}
    </a>
  );
}

export function UserMenu({ name, subtitle, logoutLabel }) {
  const router = useRouter();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-2.5 border-l border-stone-200 pl-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-600 to-violet-600 text-xs font-semibold text-white">
        {initials}
      </div>
      <div className="hidden leading-tight sm:block">
        <div className="text-[13px] font-medium text-stone-900">{name}</div>
        {subtitle && <div className="text-[11px] text-stone-400">{subtitle}</div>}
      </div>
      <button
        title={logoutLabel}
        className="cursor-pointer rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
        onClick={async () => {
          await fetch("/api/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="sr-only">{logoutLabel}</span>
      </button>
    </div>
  );
}

export function LangSwitcher({ lang }) {
  const router = useRouter();
  function setLang(l) {
    document.cookie = `fiba_lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }
  return (
    <div className="flex overflow-hidden rounded-md border border-stone-200 text-[11px] font-semibold">
      {["tr", "en"].map((l) => (
        <button key={l}
          className={`cursor-pointer px-2 py-1 uppercase transition-colors ${
            lang === l ? "bg-indigo-600 text-white" : "bg-white text-stone-400 hover:bg-stone-50 hover:text-stone-700"
          }`}
          onClick={() => setLang(l)}>
          {l}
        </button>
      ))}
    </div>
  );
}
