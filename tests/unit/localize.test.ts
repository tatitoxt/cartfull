import { describe, expect, it } from "vitest";
import ingredients from "../../data/ingredients.json";
import { countryByCode, guessCountry } from "../../lib/i18n/countries";
import { amount, grams, packageLabel, temperatures } from "../../lib/catalog/localize";

describe("amounts", () => {
  it("keeps US measures for imperial readers", () => {
    expect(amount(1.5, "lb", "en", "imperial")).toBe("1½ lb");
    expect(amount(2, "cup", "en", "imperial")).toBe("2 cups");
  });

  it("turns weights into grams and kilos for metric readers", () => {
    expect(amount(0.25, "lb", "es", "metric")).toBe("115 g");
    expect(amount(1.5, "lb", "es", "metric")).toBe("680 g");
    expect(amount(3, "lb", "es", "metric")).toBe("1,4 kg");
    expect(amount(3, "lb", "en", "metric")).toBe("1.4 kg");
    expect(amount(8, "oz", "en", "metric")).toBe("225 g");
  });

  it("names spoons and cups in Spanish", () => {
    expect(amount(2, "tbsp", "es", "metric")).toBe("2 cdas");
    expect(amount(0.5, "cup", "es", "imperial")).toBe("½ taza");
    expect(amount(3, "each", "es", "metric")).toBe("3");
  });

  it("never rounds a small weight down to nothing", () => {
    expect(grams(1, "en")).toBe("5 g");
  });
});

describe("temperatures", () => {
  it("shows the oven setting in the reader's scale", () => {
    expect(temperatures("Heat the oven to {425F}.", "imperial")).toBe("Heat the oven to 425°F.");
    expect(temperatures("Calienta el horno a {425F}.", "metric")).toBe("Calienta el horno a 220°C.");
    expect(temperatures("Bake at {350F}, then {400F}.", "metric")).toBe("Bake at 180°C, then 200°C.");
  });

  it("keeps food-safety temperatures precise while rounding oven settings", () => {
    expect(temperatures("{165F}", "metric")).toBe("74°C");
    expect(temperatures("{145F}", "metric")).toBe("63°C");
    expect(temperatures("{160F}", "metric")).toBe("71°C");
    expect(temperatures("{425F}", "metric")).toBe("220°C");
    expect(temperatures("{350F}", "metric")).toBe("180°C");
  });
});

describe("package labels", () => {
  it("translates and converts the common forms", () => {
    expect(packageLabel("16 oz bag", "es", "metric")).toBe("bolsa de 455 g");
    expect(packageLabel("16 oz bag", "en", "imperial")).toBe("16 oz bag");
    expect(packageLabel("48 oz bottle", "en", "metric")).toBe("1.4 L bottle");
    expect(packageLabel("5 lb bag", "es", "metric")).toBe("bolsa de 2,3 kg");
    expect(packageLabel("1 dozen", "es", "metric")).toBe("1 docena");
    expect(packageLabel("6 pack", "es", "imperial")).toBe("paquete de 6");
    expect(packageLabel("about 4.5 lb", "es", "metric")).toBe("unos 2 kg");
  });

  it("covers every package in the catalog", () => {
    const missing = ingredients.filter((i) => packageLabel(i.pkg_label, "es", "metric") === null);
    expect(missing.map((i) => i.pkg_label)).toEqual([]);
  });

  it("rejects a form it cannot convert", () => {
    expect(packageLabel("family size", "es", "metric")).toBeNull();
  });
});

describe("countries", () => {
  it("guesses from the browser's languages", () => {
    expect(guessCountry("es-AR,es;q=0.9,en;q=0.8").code).toBe("AR");
    expect(guessCountry("en-GB,en;q=0.9").units).toBe("metric");
    expect(guessCountry("es-419,es;q=0.9").lang).toBe("es");
    expect(guessCountry("fr-FR,fr;q=0.9,en;q=0.5").code).toBe("US");
    expect(guessCountry(null).code).toBe("US");
  });

  it("falls back to the United States for an unknown code", () => {
    expect(countryByCode("ZZ").code).toBe("US");
    expect(countryByCode("MX").lang).toBe("es");
  });
});
