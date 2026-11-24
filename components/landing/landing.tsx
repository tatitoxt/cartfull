import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Photo } from "@/components/photo";
import { PricingChoice } from "@/components/pricing-choice";
import { moneyExact, moneyRound } from "@/lib/format";
import { LANDING, fill, type Locale } from "@/lib/i18n/landing";
import { plannedWeekByHousehold, sampleWeek } from "@/lib/landing/sample";
import { Calculator } from "./calculator";
import { Reveal } from "./reveal";

/** A real app screenshot dressed as a phone. */
function Phone({ src, alt, className = "", priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div
      className={`rounded-[2.9rem] bg-[#101010] p-2 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.09),inset_0_1px_1px_rgb(255_255_255/0.18),0_32px_64px_-32px_rgb(0_0_0/0.85)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.4rem] bg-black">
        <div className="relative h-7">
          <div aria-hidden="true" className="absolute left-1/2 top-1.5 h-4 w-[5.5rem] -translate-x-1/2 rounded-full bg-[#1b1b1b] shadow-[0_0_0_1px_rgb(255_255_255/0.06)]" />
        </div>
        <Image src={src} alt={alt} width={376} height={750} priority={priority} className="h-auto w-full" />
      </div>
    </div>
  );
}

export function Landing({ locale }: { locale: Locale }) {
  const t = LANDING[locale];
  const planned = plannedWeekByHousehold();
  const sample = sampleWeek();

  return (
    <div lang={locale}>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href={locale === "es" ? "/es" : "/"} aria-label="Cartfull">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-semibold">
          <a href="#how" className="hidden min-h-11 content-center rounded-full px-3 hover:bg-bg-deep md:block">
            {t.nav.how}
          </a>
          <a href="#pricing" className="hidden min-h-11 content-center rounded-full px-3 hover:bg-bg-deep md:block">
            {t.nav.pricing}
          </a>
          <a href="#faq" className="hidden min-h-11 content-center rounded-full px-3 hover:bg-bg-deep md:block">
            {t.nav.faq}
          </a>
          <Link href={t.nav.otherHref} hrefLang={locale === "es" ? "en" : "es"} lang={locale === "es" ? "en" : "es"} className="min-h-11 content-center rounded-full px-3 text-fg-soft hover:bg-bg-deep">
            {t.nav.other}
          </Link>
          <Link href="/login" className="min-h-11 content-center rounded-full px-4 shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:bg-bg-deep">
            {t.nav.signIn}
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:pt-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 h-[34rem] w-[34rem] rounded-full bg-accent opacity-[0.07] blur-3xl"
          />
          <div className="rise relative">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">{t.hero.eyebrow}</p>
            <h1 className="mt-4 text-[2.75rem] sm:text-6xl lg:text-7xl">{t.hero.title}</h1>
            <p className="mt-6 max-w-xl text-lg text-fg-soft sm:text-xl">{t.hero.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/start" className="btn btn-cta px-8 text-lg" data-testid="hero-cta">
                {t.hero.cta}
              </Link>
              <p className="text-sm text-fg-soft">{t.hero.note}</p>
            </div>
          </div>
          <div className="rise relative mx-auto w-full max-w-sm lg:max-w-lg">
            <div className="grid grid-cols-2">
              <Phone src="/landing/plan.png" alt={t.inside.shots[0].alt} priority className="relative z-10 -rotate-3 self-start" />
              <div aria-hidden="true" className="relative z-0 -ml-[40%] mt-14 rotate-[4deg]">
                <Phone src="/landing/list.png" alt="" />
              </div>
            </div>
            <div className="floaty absolute -left-3 top-[42%] z-20 rounded-card bg-surface px-4 py-3 shadow-[inset_0_0_0_1.5px_var(--color-line),0_16px_40px_-20px_rgb(0_0_0/0.7)] backdrop-blur sm:-left-8">
              <p className="text-xs font-medium text-fg-soft">{t.hero.chips.cart}</p>
              <p className="tnum font-display text-2xl font-semibold leading-tight">$82.42</p>
              <p className="tnum text-sm font-semibold text-accent-deep">$92.58 {t.hero.chips.under}</p>
            </div>
          </div>
        </section>

        <section aria-label="Cartfull at a glance" className="border-y border-line">
          <ul className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-5 py-5">
            {t.strip.map((line) => (
              <li
                key={line}
                className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-fg-soft shadow-[inset_0_0_0_1px_var(--color-line)]"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section id="how" className="border-y border-line bg-bg-deep">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <h2 className="max-w-xl text-4xl sm:text-5xl">{t.steps.title}</h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
              {t.steps.items.map((step, index) => (
                <li key={step.title}>
                  <p className="tnum font-display text-7xl font-semibold leading-none text-accent" aria-hidden="true">
                    {index + 1}
                  </p>
                  <h3 className="mt-4 text-2xl">{step.title}</h3>
                  <p className="mt-2 text-fg-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {sample && (
          <section aria-labelledby="sample-title" className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div>
                <h2 id="sample-title" className="text-4xl sm:text-5xl">
                  {t.sample.title}
                </h2>
                <p className="mt-3 text-lg text-fg-soft">
                  {fill(t.sample.lead, { people: sample.people, budget: moneyRound(sample.budgetCents, locale) })}
                </p>
              </div>
              <p className="tnum" data-testid="sample-total">
                <span className="block text-sm font-medium text-fg-soft">{t.sample.cart}</span>
                <span className="font-display text-5xl font-semibold leading-none">{moneyExact(sample.totalCents, locale)}</span>
                <span className="ml-3 font-semibold text-accent-deep">
                  {moneyExact(sample.budgetCents - sample.totalCents, locale)} {t.sample.under}
                </span>
              </p>
            </div>
            <ol className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {sample.dinners.map((dinner, index) => (
                <li key={dinner.name} className={index === 0 ? "col-span-2 sm:col-span-1 lg:col-span-2 lg:row-span-2" : ""} data-testid="sample-dinner">
                  <Reveal delay={index * 80}>
                    <Photo
                      url={dinner.photoUrl}
                      alt=""
                      ratio={index === 0 ? 1 : 4 / 3}
                      sizes={index === 0 ? "(min-width: 1024px) 470px, 100vw" : "(min-width: 1024px) 225px, 50vw"}
                      className="w-full rounded-card"
                    />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-accent">{t.sample.days[index]}</p>
                    <h3 className={`mt-1 leading-tight ${index === 0 ? "text-2xl lg:text-3xl" : "text-lg"}`}>{dinner.name}</h3>
                    <p className="tnum mt-1 text-sm">
                      <span className="font-semibold text-accent-deep">
                        {moneyExact(dinner.centsPerServing, locale)} {t.sample.serving}
                      </span>
                      <span className="text-fg-soft"> · {dinner.minutes} min</span>
                    </p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="inside-title" className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
          <h2 id="inside-title" className="max-w-xl text-4xl sm:text-5xl">{t.inside.title}</h2>
          <p className="mt-3 max-w-xl text-lg text-fg-soft">{t.inside.lead}</p>
          <ul className="mt-10 grid grid-cols-2 gap-5 sm:gap-7 lg:grid-cols-4">
            {t.inside.shots.map((shot, index) => (
              <li key={shot.src}>
                <Reveal delay={index * 90}>
                  <Phone src={shot.src} alt={shot.alt} />
                  <p className="mt-4 text-sm font-semibold text-fg-soft">{shot.caption}</p>
                </Reveal>
              </li>
            ))}
          </ul>
          <dl className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {t.inside.features.map((item) => (
              <div key={item.title} className="border-t border-line pt-4">
                <dt className="font-display text-xl font-semibold">{item.title}</dt>
                <dd className="mt-2 text-fg-soft">{item.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-accent-deep text-bg">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <h2 className="max-w-2xl text-4xl sm:text-5xl">{t.why.title}</h2>
            <dl className="mt-10 grid gap-x-12 gap-y-9 sm:grid-cols-2">
              {t.why.items.map((item) => (
                <div key={item.title} className="border-t border-bg/25 pt-5">
                  <dt className="font-display text-2xl font-semibold text-bg">{item.title}</dt>
                  <dd className="mt-2 text-bg/85">{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="calc-heading" className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 id="calc-heading" className="text-4xl sm:text-5xl">{t.calc.title}</h2>
          </div>
          <Calculator planned={planned} copy={t.calc} cta={t.hero.cta} />
        </section>

        <section id="pricing" className="mx-auto grid w-full max-w-6xl gap-10 border-t border-line px-5 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-4xl sm:text-5xl">{t.pricing.title}</h2>
            <p className="mt-4 text-lg text-fg-soft">{t.pricing.lead}</p>
            <ul className="mt-8 space-y-3">
              {t.pricing.includes.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
                    <path d="M5 11.5 9.5 16 17 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:pt-2">
            <PricingChoice mode="landing" copy={t.pricing} landingLang={locale} />
          </div>
        </section>

        <section id="faq" className="border-t border-line">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
            <h2 className="text-4xl sm:text-5xl">{t.faq.title}</h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {t.faq.items.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-45">
                      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </summary>
                  <p className="pb-5 pr-8 text-fg-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-bg-deep">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="max-w-xl text-4xl sm:text-5xl">{t.closing.title}</h2>
            <Link href="/start" className="btn btn-cta shrink-0 px-8 text-lg">
              {t.closing.cta}
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-5 py-10 text-sm text-fg-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Legal" className="flex gap-1">
            <Link href="/terms" className="min-h-11 content-center px-3 underline underline-offset-4">
              {t.footer.terms}
            </Link>
            <Link href="/privacy" className="min-h-11 content-center px-3 underline underline-offset-4">
              {t.footer.privacy}
            </Link>
          </nav>
        </div>
        <p className="mt-4 max-w-3xl text-fg-faint">{t.footer.disclaimer}</p>
        <p className="mt-2 text-fg-faint">
          © {new Date().getFullYear()} {t.footer.rights}
        </p>
      </footer>
    </div>
  );
}
