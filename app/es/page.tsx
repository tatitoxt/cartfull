import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { LANDING } from "@/lib/i18n/landing";

export const metadata: Metadata = {
  title: "Cartfull — una semana de comidas que entra en tu presupuesto",
  description: LANDING.es.hero.lead,
  alternates: { canonical: "/es", languages: { en: "/", es: "/es" } },
};

export default function HomeEs() {
  return <Landing locale="es" />;
}
