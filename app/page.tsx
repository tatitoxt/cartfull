import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { LANDING } from "@/lib/i18n/landing";

export const metadata: Metadata = {
  title: "Cartfull — a week of dinners that fits your grocery budget",
  description: LANDING.en.hero.lead,
  keywords: [
    "meal planning on a budget",
    "grocery budget planner",
    "weekly meal plan",
    "cheap dinner ideas",
    "grocery list app",
    "meal planner with prices",
    "save money on groceries",
    "budget recipes",
  ],
  alternates: { canonical: "/", languages: { en: "/", es: "/es" } },
};

export default function Home() {
  return <Landing locale="en" />;
}
