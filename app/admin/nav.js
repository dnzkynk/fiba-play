"use client";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Genel Bakış", exact: true },
  { href: "/admin/tournaments", label: "Turnuvalar" },
  { href: "/admin/participants", label: "Katılımcılar" },
  { href: "/admin/settings", label: "Ayarlar" },
  { href: "/admin/audit", label: "Geçmiş" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
      {TABS.map((t) => {
        const active = t.exact
          ? pathname === t.href
          : pathname.startsWith(t.href) || (t.href === "/admin/tournaments" && pathname.startsWith("/admin/t/"));
        return (
          <a key={t.href} href={t.href}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium no-underline transition-colors ${
              active
                ? "border-fiba-600 text-fiba-700"
                : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800"
            }`}>
            {t.label}
          </a>
        );
      })}
    </div>
  );
}
