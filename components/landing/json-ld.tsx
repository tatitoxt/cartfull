import { PRICING, TRIAL_DAYS } from "@/lib/billing/plans";
import { siteUrl } from "@/lib/env";
import { LANDING, type Locale } from "@/lib/i18n/landing";

/** Structured data for search, answer and generative engines (SEO/AEO/GEO). */
export function JsonLd({ locale }: { locale: Locale }) {
  const t = LANDING[locale];
  const home = locale === "es" ? `${siteUrl}/es` : `${siteUrl}/`;

  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${home}#app`,
    name: "Cartfull",
    url: home,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    inLanguage: locale === "es" ? "es" : "en",
    description: t.hero.lead,
    featureList: [
      "Weekly dinner planning to a fixed grocery budget",
      "Priced grocery list sorted by store aisle",
      "Cost per serving for every recipe",
      "Pantry tracking with partial quantities",
      "Shared live grocery list",
      "Savings tracking with receipt photos",
      "Works offline in the store",
    ].join(", "),
    offers: [
      {
        "@type": "Offer",
        name: "Monthly",
        price: (PRICING.monthly.cents / 100).toFixed(2),
        priceCurrency: "USD",
        description: `${TRIAL_DAYS}-day free trial, then ${PRICING.monthly.label} per month. Cancel any time.`,
      },
      {
        "@type": "Offer",
        name: "Annual",
        price: (PRICING.annual.cents / 100).toFixed(2),
        priceCurrency: "USD",
        description: `${TRIAL_DAYS}-day free trial, then ${PRICING.annual.label} per year. Cancel any time.`,
      },
    ],
    author: {
      "@type": "Organization",
      name: "Cartfull",
      url: siteUrl,
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t.steps.title,
    step: t.steps.items.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(app) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }} />
    </>
  );
}
