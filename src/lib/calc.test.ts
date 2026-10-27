import { describe, expect, it } from "vitest";
import { loanSchedule, marginMarkup, priceFromMargin, stackedDiscount, tieredCommission, workingDays } from "./calc";

describe("calculators", () => {
  it("loan payment", () => {
    const l = loanSchedule(10000, 12, 12);
    expect(l.payment).toBeCloseTo(888.49, 2);
    expect(l.rows.at(-1)!.balance).toBeCloseTo(0, 6);
    expect(loanSchedule(1200, 0, 12).payment).toBe(100);
  });
  it("margin vs markup", () => {
    const m = marginMarkup(80, 100);
    expect(m.margin).toBeCloseTo(20);
    expect(m.markup).toBeCloseTo(25);
    expect(priceFromMargin(80, 20)).toBeCloseTo(100);
  });
  it("stacked discounts", () => {
    expect(stackedDiscount(100, [10, 10]).final).toBeCloseTo(81);
  });
  it("marginal commission tiers", () => {
    const c = tieredCommission(15000, [{ upTo: 10000, ratePct: 5 }, { upTo: null, ratePct: 10 }]);
    expect(c.total).toBeCloseTo(1000);
  });
  it("working days", () => {
    expect(workingDays("2026-10-26", "2026-11-01")).toEqual({ working: 5, weekend: 2, holidays: 0 });
    expect(workingDays("2026-10-26", "2026-10-30", ["2026-10-27"])!.working).toBe(4);
  });
});
