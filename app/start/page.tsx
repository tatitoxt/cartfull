import type { Metadata } from "next";
import { catalog } from "@/lib/catalog";
import { pantryGroups } from "@/lib/app/pantry";
import { stapleIds } from "@/lib/planner/cart";
import { DISLIKE_OPTIONS } from "@/lib/planner/dislikes";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/messages";
import { Onboarding } from "./onboarding";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getLocale();
  return {
    title: MESSAGES[lang].metadata.start,
    description: lang === "es" ? "Responde unas preguntas y luego recibe una semana de comidas dentro de tu presupuesto." : "A few quick questions, then a week of meals priced to your budget.",
  };
}

export default async function StartPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Onboarding
      signedIn={Boolean(user)}
      pantry={pantryGroups(catalog.ingredients)}
      staples={stapleIds(catalog.ingredients)}
      dislikeOptions={DISLIKE_OPTIONS.map(({ key }) => ({ key }))}
      initialCountry={locale.country}
    />
  );
}
