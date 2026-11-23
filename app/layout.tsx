import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { ServiceWorker } from "@/components/service-worker";
import { WholeResponses } from "@/components/whole-responses";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display-face",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const title = "Cartfull — a week of meals that fits your grocery budget";
const description =
  "Tell us your weekly grocery budget. Cartfull plans the week, prices the cart, and shows you what you saved.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s · Cartfull" },
  description,
  applicationName: "Cartfull",
  appleWebApp: { capable: true, title: "Cartfull", statusBarStyle: "default" },
  openGraph: { title, description, siteName: "Cartfull", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title, description },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <WholeResponses />
        {children}
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}
