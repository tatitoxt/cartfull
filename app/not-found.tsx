import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Logo />
      <h1 className="mt-8 text-4xl">That page isn&apos;t on the list</h1>
      <p className="mt-3 text-ink-soft">The link may be old, or the page may have moved.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/app/plan" className="btn btn-primary">
          Go to my plan
        </Link>
        <Link href="/" className="btn btn-quiet">
          Home
        </Link>
      </div>
    </main>
  );
}
