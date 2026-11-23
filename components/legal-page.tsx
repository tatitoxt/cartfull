import Link from "next/link";
import { Logo } from "@/components/logo";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6">
      <Link href="/" aria-label="Cartfull home">
        <Logo />
      </Link>
      <main id="main" className="legal mt-10">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-fg-faint">Last updated {updated}</p>
        {children}
      </main>
    </div>
  );
}
