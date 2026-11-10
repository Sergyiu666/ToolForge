const DAY = 86_400_000;
function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

/** Calendar-day terms; simple daily contractual penalty, no compounding or statutory assumptions. */
export function paymentDue(invoiceDate: string, terms: number, asOf: string, outstanding: number, dailyRate: number) {
  const invoice = parseDate(invoiceDate), checked = parseDate(asOf);
  if (invoice === null || checked === null || checked < invoice || !Number.isInteger(terms) || terms < 0 || terms > 36500 || !Number.isFinite(outstanding) || outstanding < 0 || !Number.isFinite(dailyRate) || dailyRate < 0 || dailyRate > 100) return null;
  const due = invoice + terms * DAY;
  const overdue = Math.max(0, Math.floor((checked - due) / DAY));
  const penalty = outstanding * dailyRate / 100 * overdue;
  return { dueDate: new Date(due).toISOString().slice(0, 10), overdue, penalty, total: outstanding + penalty };
}
export type LedgerPayment = { date: string; amount: number };
export type LedgerRow = { from: string; to: string; days: number; principal: number; accrued: number; paid: number; principalLeft: number; penaltyLeft: number };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Staggered partial payments; mode chooses whether payments reduce principal or accrued penalties first. capPct caps total penalties as % of the initial amount. */
export function paymentLedger(o: { invoiceDate: string; terms: number; asOf: string; amount: number; dailyRate: number; payments: LedgerPayment[]; mode: 'principal' | 'penalty'; capPct: number | null }) {
  const base = paymentDue(o.invoiceDate, o.terms, o.asOf, o.amount, o.dailyRate);
  if (!base || (o.capPct !== null && (!Number.isFinite(o.capPct) || o.capPct < 0))) return null;
  const due = parseDate(base.dueDate)!, end = parseDate(o.asOf)!;
  const pays: { t: number; amount: number }[] = [];
  for (const p of o.payments) {
    const t = parseDate(p.date);
    if (t === null || !Number.isFinite(p.amount) || p.amount <= 0) return null;
    if (t <= end) pays.push({ t, amount: p.amount });
  }
  pays.sort((a, b) => a.t - b.t);
  const cap = o.capPct === null ? Infinity : o.amount * o.capPct / 100;
  let principal = o.amount, penalty = 0, accruedTotal = 0, paidTotal = 0, cursor = due;
  const rows: LedgerRow[] = [];
  for (const ev of [...pays, { t: end, amount: 0, final: true }]) {
    const to = Math.max(ev.t, due), days = Math.max(0, Math.round((to - cursor) / DAY));
    const startPrincipal = principal;
    const accrued = Math.min(principal * o.dailyRate / 100 * days, Math.max(0, cap - accruedTotal));
    accruedTotal += accrued; penalty += accrued;
    let pay = ev.amount; paidTotal += pay;
    const order = o.mode === 'penalty' ? ['penalty', 'principal'] : ['principal', 'penalty'];
    for (const k of order) {
      if (k === 'penalty') { const x = Math.min(pay, penalty); penalty -= x; pay -= x; }
      else { const x = Math.min(pay, principal); principal -= x; pay -= x; }
    }
    if (ev.amount > 0 || days > 0 || !('final' in ev)) rows.push({ from: iso(cursor), to: iso(ev.t), days, principal: startPrincipal, accrued, paid: ev.amount, principalLeft: principal, penaltyLeft: penalty });
    cursor = to;
  }
  return { dueDate: base.dueDate, rows, paidTotal, accruedTotal, principal, penalty, balance: principal + penalty, capped: accruedTotal >= cap && cap !== Infinity };
}
