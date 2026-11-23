import type { Ingredient } from "../catalog/types";

export interface DislikeOption {
  key: string;
  label: string;
  matches: (ing: Ingredient) => boolean;
}

const ids = (...list: string[]) => (ing: Ingredient) => list.includes(ing.id);

/** Foods a household can rule out. Any recipe using a match is never planned. */
export const DISLIKE_OPTIONS: DislikeOption[] = [
  { key: "beef", label: "Beef", matches: (i) => i.kind === "beef" && i.id !== "beef_broth" },
  { key: "pork", label: "Pork", matches: (i) => i.kind === "pork" },
  { key: "chicken", label: "Chicken", matches: (i) => /chicken/.test(i.id) && i.id !== "chicken_broth" },
  { key: "turkey", label: "Turkey", matches: (i) => /turkey/.test(i.id) },
  { key: "fish", label: "Fish", matches: (i) => i.kind === "fish" && i.id !== "worcestershire" },
  { key: "shellfish", label: "Shrimp", matches: (i) => i.kind === "shellfish" },
  { key: "eggs", label: "Eggs", matches: ids("eggs") },
  { key: "tofu", label: "Tofu", matches: ids("tofu") },
  { key: "beans", label: "Beans", matches: (i) => /_beans$|^chickpeas$|^lentils$/.test(i.id) && i.id !== "green_beans" },
  { key: "mushrooms", label: "Mushrooms", matches: ids("mushroom") },
  { key: "bell_peppers", label: "Bell peppers", matches: ids("bell_pepper") },
  { key: "tomatoes", label: "Fresh tomatoes", matches: ids("tomato", "cherry_tomato") },
  { key: "onions", label: "Onions", matches: ids("onion_yellow", "onion_red", "green_onion") },
  { key: "broccoli", label: "Broccoli", matches: ids("broccoli", "broccoli_frozen") },
  { key: "cauliflower", label: "Cauliflower", matches: ids("cauliflower", "cauliflower_rice") },
  { key: "spinach", label: "Spinach", matches: ids("spinach", "spinach_frozen") },
  { key: "kale", label: "Kale", matches: ids("kale") },
  { key: "cabbage", label: "Cabbage", matches: ids("cabbage", "coleslaw_mix") },
  { key: "zucchini", label: "Zucchini", matches: ids("zucchini") },
  { key: "eggplant", label: "Eggplant", matches: ids("eggplant") },
  { key: "sweet_potato", label: "Sweet potato", matches: ids("sweet_potato") },
  { key: "avocado", label: "Avocado", matches: ids("avocado") },
  { key: "cilantro", label: "Cilantro", matches: ids("cilantro") },
  { key: "spicy", label: "Spicy food", matches: (i) => i.spicy },
];

export const DISLIKE_KEYS = DISLIKE_OPTIONS.map((d) => d.key);
