import type { Ingredient } from "../catalog/types";

/** Non-staple foods many kitchens already hold; offered on the pantry step. */
const COMMON_IDS = [
  "rice_white",
  "pasta_spaghetti",
  "pasta_penne",
  "oats",
  "eggs",
  "butter",
  "milk",
  "bread",
  "onion_yellow",
  "garlic",
  "potato_russet",
  "peanut_butter",
  "chicken_broth",
  "diced_tomatoes",
  "black_beans",
  "cheddar",
  "parmesan",
  "lentils",
  "peas_frozen",
];

export interface PantryOption {
  id: string;
  name: string;
  name_es?: string;
}

export interface PantryGroups {
  /** Oils, condiments, baking basics and spices: assumed on hand unless unticked. */
  basics: { key: "condiments" | "pantry" | "spices"; items: PantryOption[] }[];
  /** Foods worth asking about. */
  common: PantryOption[];
}

export function pantryGroups(ingredients: ReadonlyMap<string, Ingredient>): PantryGroups {
  const staples = [...ingredients.values()].filter((i) => i.staple);
  const pick = (aisle: string) =>
    staples.filter((i) => i.aisle === aisle).map((i) => ({ id: i.id, name: i.name, name_es: i.name_es }));
  return {
    basics: [
      { key: "condiments", items: pick("condiments") },
      { key: "pantry", items: pick("pantry") },
      { key: "spices", items: pick("spices") },
    ].filter((group) => group.items.length > 0) as PantryGroups["basics"],
    common: COMMON_IDS.flatMap((id) => {
      const ing = ingredients.get(id);
      return ing ? [{ id, name: ing.name, name_es: ing.name_es }] : [];
    }),
  };
}
