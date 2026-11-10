export type BnrDay = { date: string; rates: Record<string, number> };

/** Parse BNR XML: each Rate is RON per `multiplier` units of currency; normalized to RON per 1 unit. */
export function parseBnrXml(xml: string): BnrDay[] {
  const days: BnrDay[] = [];
  for (const cube of xml.matchAll(/<Cube date="(\d{4}-\d{2}-\d{2})">([\s\S]*?)<\/Cube>/g)) {
    const rates: Record<string, number> = { RON: 1 };
    for (const r of (cube[2] ?? '').matchAll(/<Rate currency="([A-Z]{3})"(?:\s+multiplier="(\d+)")?>([\d.]+)<\/Rate>/g)) {
      const value = Number(r[3]) / Number(r[2] ?? 1);
      if (value > 0 && r[1]) rates[r[1]] = value;
    }
    days.push({ date: cube[1] ?? '', rates });
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

/** Latest published day on or before the date (BNR does not publish on weekends/holidays). */
export const pickDay = (days: BnrDay[], date: string) => days.filter(d => d.date <= date).at(-1);

export const convert = (amount: number, from: string, to: string, rates: Record<string, number>) =>
  rates[from] && rates[to] ? (amount * rates[from]) / rates[to] : NaN;
