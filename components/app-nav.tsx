"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMessages } from "@/lib/i18n/locale-provider";

const PATHS: Record<string, string> = {
  plan: "M2 7.5 12 2l10 5.5M4.8 9.8V22h14.4V9.8M8.8 22v-6.4h6.4V22",
  list: "M3.5 3.5h2l2.4 11a2 2 0 0 0 2 1.5h8.2a2 2 0 0 0 2-1.5L21.5 6H6.1M9.7 20.7a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm8.2 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z",
  savings: "M12 2.6v18.8M17 7.2H9.8a2.9 2.9 0 0 0 0 5.8h4.4a2.9 2.9 0 0 1 0 5.8H6.6",
  account: "M12 12a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8ZM3.6 21.2a8.4 8.4 0 0 1 16.8 0",
};

export function AppNav() {
  const m = useMessages();
  const pathname = usePathname();
  const items = [
    { key: "plan", label: m.nav.plan, href: "/app" },
    { key: "list", label: m.nav.list, href: "/app/list" },
    { key: "savings", label: m.nav.savings, href: "/app/savings" },
    { key: "account", label: m.nav.account, href: "/app/account" },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-3 pt-1" aria-label="App">
      <ul className="mx-auto flex max-w-md gap-1 rounded-full bg-bg p-1.5 shadow-[inset_0_0_0_1.5px_var(--color-line)]">
        {items.map((item) => {
          const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
          return (
          <li key={item.key} className="flex-1">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors ${
                active ? "bg-fg text-bg" : "text-fg-soft hover:text-fg"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4.5 shrink-0"
                aria-hidden="true"
              >
                <path d={PATHS[item.key]} />
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
