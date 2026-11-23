import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { ServiceWorker } from "@/components/service-worker";
import { WholeResponses } from "@/components/whole-responses";
import { siteUrl } from "@/lib/env";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { getLocale } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/messages";
import "./globals.css";

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { title, description } = MESSAGES[locale.lang].metadata;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: "%s · Cartfull" },
    description,
    applicationName: "Cartfull",
    appleWebApp: { capable: true, title: "Cartfull", statusBarStyle: "default" },
    openGraph: { title, description, siteName: "Cartfull", type: "website", locale: locale.lang === "es" ? "es_419" : "en_US" },
    twitter: { card: "summary_large_image", title, description },
    icons: {
      icon: [
        { url: "/icons/icon.svg", type: "image/svg+xml" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return getLocale().then((locale) => (
    <html lang={locale.lang} className={body.variable} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("cartfull:theme"),a=localStorage.getItem("cartfull:accent");if(t)document.documentElement.dataset.theme=t;if(a)document.documentElement.dataset.accent=a;}catch(e){}',
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
        >
          {MESSAGES[locale.lang].common.skip}
        </a>
        <WholeResponses />
        <LocaleProvider key={`${locale.country}-${locale.lang}-${locale.units}`} initial={locale}>
          {children}
        </LocaleProvider>
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  ));
}
