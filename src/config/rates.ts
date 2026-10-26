/** Romanian values in percent and RON. null always means TODO, never zero. */
export type RomanianRateSet = {
  effectiveFrom: string | null;
  lastVerified: string | null;
  vat: { standard: number | null; reduced: readonly number[] | null; zero: number | null };
  cas: number | null;
  cass: number | null;
  incomeTax: number | null;
  personalDeduction: number | null;
  minimumWage: number | null;
};

export const romanianRateSets: readonly RomanianRateSet[] = [
  {
    // TODO: establish the legal effective date; do not treat this as a dated statutory set.
    effectiveFrom: null,
    // TODO: verify against an official source and record its verification date.
    lastVerified: null,
    vat: {
      standard: 21, // Existing calculator default only; not newly verified.
      reduced: null, // TODO: verified reduced VAT rates.
      zero: null, // TODO: verified zero-rate rules/value.
    },
    cas: null, // TODO: verified CAS percentage.
    cass: null, // TODO: verified CASS percentage.
    incomeTax: null, // TODO: verified income tax percentage.
    personalDeduction: null, // TODO: verified deduction value/schedule in RON.
    minimumWage: null, // TODO: verified minimum wage in RON.
  },
];

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Latest effective set on/before date; unknown dates never establish legal applicability. */
export function getRomanianRates(date: string, sets: readonly RomanianRateSet[] = romanianRateSets): RomanianRateSet | undefined {
  if (!validDate(date)) return undefined;
  return sets.reduce<RomanianRateSet | undefined>((selected, set) => {
    if (!set.effectiveFrom || !validDate(set.effectiveFrom) || set.effectiveFrom > date) return selected;
    return !selected?.effectiveFrom || set.effectiveFrom > selected.effectiveFrom ? set : selected;
  }, undefined);
}

/** Preserve the manual calculator's legacy default until verified dated sets are supplied. */
export function getInitialVatRate(date: string): string {
  const matched = getRomanianRates(date);
  const rate = matched ? matched.vat.standard : romanianRateSets.find(set => set.effectiveFrom === null)?.vat.standard;
  return rate == null ? "" : String(rate);
}