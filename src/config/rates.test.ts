import { describe, expect, it } from "vitest";
import { getInitialVatRate, getRomanianRates, romanianRateSets, type RomanianRateSet } from "./rates";

const fixture = (effectiveFrom: string | null): RomanianRateSet => ({
  effectiveFrom, lastVerified: null,
  vat: { standard: null, reduced: null, zero: null },
  cas: null, cass: null, incomeTax: null, personalDeduction: null, minimumWage: null,
});

describe("Romanian rate configuration", () => {
  it("preserves the existing 21% manual calculator default", () => {
    expect(getInitialVatRate("2026-10-26")).toBe("21");
  });
  it("leaves unused values and unverified dates explicitly unknown", () => {
    expect(romanianRateSets[0]).toEqual({
      effectiveFrom: null, lastVerified: null,
      vat: { standard: 21, reduced: null, zero: null },
      cas: null, cass: null, incomeTax: null, personalDeduction: null, minimumWage: null,
    });
  });
  it("picks the latest effective set, including its first day, independent of list order", () => {
    const older = fixture("2025-01-01");
    const newer = fixture("2026-01-01");
    const sets = [newer, fixture(null), older];
    expect(getRomanianRates("2025-12-31", sets)).toBe(older);
    expect(getRomanianRates("2026-01-01", sets)).toBe(newer);
    expect(getRomanianRates("2026-10-26", sets)).toBe(newer);
  });
  it("never guesses a set before the first effective date or from undated values", () => {
    expect(getRomanianRates("2024-12-31", [fixture("2025-01-01")])).toBeUndefined();
    expect(getRomanianRates("2026-10-26")).toBeUndefined();
  });
  it("rejects invalid dates instead of silently shifting their effective period", () => {
    expect(getRomanianRates("2026-02-30", [fixture("2026-01-01")])).toBeUndefined();
    expect(getRomanianRates("26-10-2026")).toBeUndefined();
  });
});