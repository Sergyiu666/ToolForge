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