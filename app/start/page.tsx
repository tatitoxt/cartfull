import type { Metadata } from "next";
import { catalog } from "@/lib/catalog";
import { pantryGroups } from "@/lib/app/pantry";
import { stapleIds } from "@/lib/planner/cart";
import { DISLIKE_OPTIONS } from "@/lib/planner/dislikes";
import { createClient } from "@/lib/supabase/server";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = {
  title: "Plan my week",
  description: "Four quick questions, then a week of meals priced to your budget.",
};

export default async function StartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Onboarding
      signedIn={Boolean(user)}
      pantry={pantryGroups(catalog.ingredients)}
      staples={stapleIds(catalog.ingredients)}
      dislikeOptions={DISLIKE_OPTIONS.map(({ key, label }) => ({ key, label }))}
    />
  );
}
