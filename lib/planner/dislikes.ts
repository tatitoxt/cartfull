import type { Ingredient } from "../catalog/types";

export interface DislikeOption {
  key: string;
  matches: (ing: Ingredient) => boolean;
}

const ids = (...list: string[]) => (ing: Ingredient) => list.includes(ing.id);

/** Foods a household can rule out. Any recipe using a match is never planned. */
export const DISLIKE_OPTIONS: DislikeOption[] = [
  { key: "beef", matches: (i) => i.kind === "beef" && i.id !== "beef_broth" },
  { key: "pork", matches: (i) => i.kind === "pork" },
  { key: "chicken", matches: (i) => /chicken/.test(i.id) && i.id !== "chicken_broth" },
  { key: "turkey", matches: (i) => /turkey/.test(i.id) },
  { key: "fish", matches: (i) => i.kind === "fish" && i.id !== "worcestershire" },
  { key: "shellfish", matches: (i) => i.kind === "shellfish" },
  { key: "eggs", matches: ids("eggs") },
  { key: "tofu", matches: ids("tofu") },
  { key: "beans", matches: (i) => /_beans$|^chickpeas$|^lentils$/.test(i.id) && i.id !== "green_beans" },
  { key: "mushrooms", matches: ids("mushroom") },
  { key: "bell_peppers", matches: ids("bell_pepper") },
  { key: "tomatoes", matches: ids("tomato", "cherry_tomato") },
  { key: "onions", matches: ids("onion_yellow", "onion_red", "green_onion") },
  { key: "broccoli", matches: ids("broccoli", "broccoli_frozen") },
  { key: "cauliflower", matches: ids("cauliflower", "cauliflower_rice") },
  { key: "spinach", matches: ids("spinach", "spinach_frozen") },
  { key: "kale", matches: ids("kale") },
  { key: "cabbage", matches: ids("cabbage", "coleslaw_mix") },
  { key: "zucchini", matches: ids("zucchini") },
  { key: "eggplant", matches: ids("eggplant") },
  { key: "sweet_potato", matches: ids("sweet_potato") },
  { key: "avocado", matches: ids("avocado") },
  { key: "cilantro", matches: ids("cilantro") },
  { key: "spicy", matches: (i) => i.spicy },
];

export const DISLIKE_KEYS = DISLIKE_OPTIONS.map((d) => d.key);
