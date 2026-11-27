import type { Metadata } from "next";
import { DocumentLang } from "@/components/landing/document-lang";
import { Landing } from "@/components/landing/landing";
import { LANDING } from "@/lib/i18n/landing";

export const metadata: Metadata = {
  title: "Cartfull — una semana de comidas que entra en tu presupuesto",
  description: LANDING.es.hero.lead,
  keywords: [
    "planificar comidas baratas",
    "presupuesto de supermercado",
    "menú semanal económico",
    "lista de compras con precios",
    "recetas baratas",
    "ahorrar en el supermercado",
  ],
  alternates: { canonical: "/es", languages: { en: "/", es: "/es" } },
};

export default function HomeEs() {
  return (
    <>
      <DocumentLang lang="es" />
      <Landing locale="es" />
    </>
  );
}
