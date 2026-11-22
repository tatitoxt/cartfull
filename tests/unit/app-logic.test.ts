import { describe, expect, it } from "vitest";
import { answersSchema, typicalSpendCents } from "@/lib/app/profile";
import { summarizeSavings, weekSavings } from "@/lib/app/savings";
import { addDays, targetWeekStart, today, weekIsOver, weekLabel, weekday } from "@/lib/app/week";
import { ANNUAL_SAVING_PERCENT, hasAccess, PRICING, TRIAL_DAYS } from "@/lib/billing/plans";
import { money, moneyExact, moneyRound, quantity } from "@/lib/format";
import { fill } from "@/lib/i18n/landing";
import { safeNext } from "@/lib/safe-next";

const plan = (over = {}) => ({
  id: "p1",
  week_start: "2026-11-23",
  budget_cents: 10000,
  usual_spend_cents: 18000 as number | null,
  household_size: 4,
  total_cents: 9200,
  spent_cents: null as number | null,
  ...over,
});

describe("savings", () => {
  it("compares the planned cart with the usual spend until a receipt is entered", () => {
    expect(weekSavings(plan())).toMatchObject({ savedCents: 8800, spentCents: 9200, spentIsActual: false, underBudget: true });
  });

  it("uses the receipt total once entered, even when it is zero", () => {
    expect(weekSavings(plan({ spent_cents: 10450 }))).toMatchObject({ savedCents: 7550, spentIsActual: true, underBudget: false });
    expect(weekSavings(plan({ spent_cents: 0 }))).toMatchObject({ savedCents: 18000, spentIsActual: true });
  });

  it("shows an expensive week as negative instead of hiding it", () => {
    expect(weekSavings(plan({ spent_cents: 21000 })).savedCents).toBe(-3000);
  });

  it("falls back to a household estimate when usual spend is unknown", () => {
    const week = weekSavings(plan({ usual_spend_cents: null }));
    expect(week.usualIsEstimate).toBe(true);
    expect(week.usualCents).toBe(typicalSpendCents(4));
  });

  it("totals weeks and projects a yearly pace from the average", () => {
    const summary = summarizeSavings([plan({ id: "a", spent_cents: 9000 }), plan({ id: "b" }), plan({ id: "c", spent_cents: 20000 })]);
    expect(summary.totalSavedCents).toBe(9000 + 8800 - 2000);
    expect(summary.confirmedWeeks).toBe(2);
    expect(summary.confirmedSavedCents).toBe(7000);
    expect(summary.averageSavedCents).toBe(Math.round(15800 / 3));
    expect(summary.yearlyPaceCents).toBe(summary.averageSavedCents * 52);
    expect(summarizeSavings([])).toMatchObject({ totalSavedCents: 0, averageSavedCents: 0, yearlyPaceCents: 0 });
  });
});

describe("weeks", () => {
  it("reads today's date in US Central time", () => {
    expect(today(new Date("2026-11-23T04:30:00Z"))).toBe("2026-11-22");
    expect(today(new Date("2026-11-23T07:00:00Z"))).toBe("2026-11-23");
  });

  it("plans the current week on weekdays and the next one at the weekend", () => {
    expect(weekday("2026-11-23")).toBe(0);
    expect(targetWeekStart("2026-11-23")).toBe("2026-11-23"); // Monday
    expect(targetWeekStart("2026-11-27")).toBe("2026-11-23"); // Friday
    expect(targetWeekStart("2026-11-28")).toBe("2026-11-30"); // Saturday
    expect(targetWeekStart("2026-11-29")).toBe("2026-11-30"); // Sunday
  });

  it("handles month and year boundaries", () => {
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(weekLabel("2026-12-28")).toBe("Dec 28 – Jan 3");
    expect(weekIsOver("2026-11-23", "2026-11-29")).toBe(false);
    expect(weekIsOver("2026-11-23", "2026-11-30")).toBe(true);
  });
});

describe("billing constants", () => {
  it("matches the published prices", () => {
    expect(TRIAL_DAYS).toBe(7);
    expect(PRICING.monthly.cents).toBe(999);
    expect(PRICING.annual.cents).toBe(4999);
    expect(ANNUAL_SAVING_PERCENT).toBe(58);
    expect(PRICING.annual.perMonthLabel).toBe(`$${(4999 / 12 / 100).toFixed(2)}`);
  });

  it("grants access only while trialing or active", () => {
    expect(hasAccess("trialing")).toBe(true);
    expect(hasAccess("active")).toBe(true);
    for (const status of ["past_due", "canceled", "unpaid", "incomplete", "incomplete_expired", "paused", "none", "", null, undefined]) {
      expect(hasAccess(status)).toBe(false);
    }
  });
});

describe("onboarding answers", () => {
  const valid = {
    weekly_budget_cents: 10000,
    usual_spend_cents: null,
    household_size: 4,
    diet: "none",
    cook_time: "normal",
    include_breakfast: false,
    include_lunch: false,
    allergens: [],
    dislikes: [],
    pantry: ["salt"],
  };

  it("accepts a normal household", () => {
    expect(answersSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects out-of-range and unknown values", () => {
    for (const patch of [
      { weekly_budget_cents: 2999 },
      { weekly_budget_cents: 40001 },
      { weekly_budget_cents: 100.5 },
      { household_size: 0 },
      { household_size: 9 },
      { diet: "carnivore" },
      { cook_time: "instant" },
      { allergens: ["gluten", "sadness"] },
      { dislikes: ["everything"] },
      { pantry: ["Robert'); DROP TABLE"] },
    ]) {
      expect(answersSchema.safeParse({ ...valid, ...patch }).success, JSON.stringify(patch)).toBe(false);
    }
  });
});

describe("formatting and redirects", () => {
  it("formats money for the context", () => {
    expect(money(8400)).toBe("$84");
    expect(money(8450)).toBe("$84.50");
    expect(moneyExact(210)).toBe("$2.10");
    expect(moneyRound(123456)).toBe("$1,235");
  });

  it("writes kitchen quantities as fractions", () => {
    expect(quantity(1.5)).toBe("1½");
    expect(quantity(0.25)).toBe("¼");
    expect(quantity(2)).toBe("2");
    expect(quantity(2.1)).toBe("2.1");
    expect(quantity(0.333)).toBe("⅓");
  });

  it("fills copy placeholders and leaves unknown ones alone", () => {
    expect(fill("About {amount} a year for {people}.", { amount: "$900", people: 4 })).toBe("About $900 a year for 4.");
    expect(fill("{missing}", {})).toBe("{missing}");
  });

  it("only allows same-site paths after sign-in", () => {
    expect(safeNext("/app/list")).toBe("/app/list");
    expect(safeNext("/start?finish=1")).toBe("/start?finish=1");
    for (const bad of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"]) {
      expect(safeNext(bad)).toBe("/app");
    }
  });
});
