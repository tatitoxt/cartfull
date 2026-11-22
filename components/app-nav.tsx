"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app/plan", label: "Plan", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/app/list", label: "List", icon: "M4 5h2l2.2 10h9.3L20 8H8.5M10 19.5h.01M17 19.5h.01" },
  { href: "/app/savings", label: "Savings", icon: "M4 17l5-5 4 3 7-8M15 7h5v5" },
  { href: "/app/account", label: "Account", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0" },
];

/** Tabs along the bottom on phones, inline in the header on wider screens. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:pb-0"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4 sm:flex sm:gap-1">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold sm:min-h-11 sm:flex-row sm:rounded-full sm:px-4 sm:text-sm ${
                  active ? "text-green-deep sm:bg-mint-soft" : "text-ink-soft hover:text-ink"
                }`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="sm:hidden">
                  <path d={item.icon} fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
