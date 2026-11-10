import { workingDays } from './calc';
import { romanianHolidays } from './holidays';

export type Leave = { start: string; end: string };
/** Leave days = weekdays in each period minus Romanian public holidays; overlapping days counted once. */
export function vacationBalance(allowance: number, carryover: number, leaves: Leave[]) {
  const seen = new Set<string>();
  const rows = leaves.map(l => {
    const years = [Number(l.start.slice(0, 4)), Number(l.end.slice(0, 4))];
    const hol = [years[0], years[1]].flatMap(y => romanianHolidays(y)).map(h => h.date);
    const r = l.start && l.end ? workingDays(l.start, l.end, hol) : null;
    if (!r) return { ...l, days: null as number | null };
    let days = 0;
    const holSet = new Set(hol);
    for (const d = new Date(`${l.start}T00:00:00Z`); d <= new Date(`${l.end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10), wd = d.getUTCDay();
      if (wd === 0 || wd === 6 || holSet.has(iso) || seen.has(iso)) continue;
      seen.add(iso); days++;
    }
    return { ...l, days };
  });
  const used = rows.reduce((s, r) => s + (r.days ?? 0), 0);
  return { rows, used, total: allowance + carryover, remaining: allowance + carryover - used };
}
