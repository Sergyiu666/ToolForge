export type VatField = "net" | "vat" | "gross";
export type VatResult = { net: number; vat: number; gross: number };

const round = (n: number) => Math.round(n * 100) / 100;

/** Given one known amount and a VAT rate (percent), compute all three. */
export function computeVat(field: VatField, amount: number, ratePct: number): VatResult {
  const r = ratePct / 100;
  let net: number;
  if (field === "net") net = amount;
  else if (field === "gross") net = amount / (1 + r);
  else net = r === 0 ? 0 : amount / r;
  return { net: round(net), vat: round(net * r), gross: round(net * (1 + r)) };
}
