import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { catalog } from "@/lib/catalog";
import { answersSchema } from "@/lib/app/profile";
import { estimateWeek } from "@/lib/planner/plan";
import { NotEnoughRecipesError } from "@/lib/planner/types";

const schema = answersSchema.omit({ weekly_budget_cents: true, usual_spend_cents: true });

/** What a week costs for the household described, before any budget is applied. */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const estimate = estimateWeek(catalog, {
      householdSize: body.household_size,
      diet: body.diet,
      cookTime: body.cook_time,
      includeBreakfast: body.include_breakfast,
      includeLunch: body.include_lunch,
      pantry: new Set(body.pantry),
      allergens: body.allergens,
      dislikes: body.dislikes,
      equipment: body.equipment,
      seed: 1,
    });
    return NextResponse.json(estimate);
  } catch (error) {
    if (error instanceof NotEnoughRecipesError)
      return NextResponse.json({ error: "not_enough_recipes", slot: error.slot, available: error.available });
    throw error;
  }
}
