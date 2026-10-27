/** Monthly annuity payment and schedule. ratePct is annual nominal interest. */
export function loanSchedule(principal: number, ratePct: number, months: number) {
  const r = ratePct / 100 / 12;
  const payment = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));
  const rows: { month: number; payment: number; interest: number; principal: number; balance: number }[] = [];
  let balance = principal;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const princ = Math.min(payment - interest, balance);
    balance = Math.max(0, balance - princ);
    rows.push({ month: m, payment: princ + interest, interest, principal: princ, balance });
  }
  return { payment, totalPaid: rows.reduce((s, x) => s + x.payment, 0), rows };
}

/** From cost and price: margin % (of price) and markup % (of cost). */
export function marginMarkup(cost: number, price: number) {
  const profit = price - cost;
  return { profit, margin: price ? (profit / price) * 100 : NaN, markup: cost ? (profit / cost) * 100 : NaN };
}
export const priceFromMargin = (cost: number, marginPct: number) => cost / (1 - marginPct / 100);
export const priceFromMarkup = (cost: number, markupPct: number) => cost * (1 + markupPct / 100);

/** Stacked discounts are applied one after another. */
export function stackedDiscount(price: number, discountsPct: number[]) {
  const final = discountsPct.reduce((p, d) => p * (1 - d / 100), price);
  return { final, saved: price - final, effectivePct: price ? ((price - final) / price) * 100 : 0 };
}

export type Tier = { upTo: number | null; ratePct: number };
/** Marginal tiers: each tier's rate applies only to the portion of sales inside it. */
export function tieredCommission(sales: number, tiers: Tier[]) {
  let prev = 0, total = 0;
  const parts: { from: number; to: number; ratePct: number; amount: number }[] = [];
  for (const t of tiers) {
    const cap = t.upTo ?? Infinity;
    if (sales <= prev) break;
    const portion = Math.min(sales, cap) - prev;
    const amount = (portion * t.ratePct) / 100;
    parts.push({ from: prev, to: Math.min(sales, cap), ratePct: t.ratePct, amount });
    total += amount;
    prev = cap;
  }
  return { total, parts };
}

/** Mon–Fri days between two ISO dates inclusive, excluding listed ISO holiday dates. */
export function workingDays(start: string, end: string, holidays: string[] = []) {
  const s = new Date(`${start}T00:00:00Z`), e = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()) || s > e) return null;
  const skip = new Set(holidays);
  let count = 0, weekend = 0, hol = 0;
  for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day === 0 || day === 6) weekend++;
    else if (skip.has(d.toISOString().slice(0, 10))) hol++;
    else count++;
  }
  return { working: count, weekend, holidays: hol };
}
