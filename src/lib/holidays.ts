export const HOLIDAY_SOURCE = 'https://legislatie.just.ro/Public/DetaliiDocument/128647';
export const HOLIDAY_VERIFIED = '2026-11-09';
export type Holiday = { date: string; name: string };
export const HOLIDAY_YEARS = [2024, 2025, 2026, 2027];
const easter: Record<number, { orthodox: string; western: string }> = {
  2024: { orthodox: '2024-05-05', western: '2024-03-31' },
  2025: { orthodox: '2025-04-20', western: '2025-04-20' },
  2026: { orthodox: '2026-04-12', western: '2026-04-05' },
  2027: { orthodox: '2027-05-02', western: '2027-03-28' },
};
export function romanianHolidays(year: number, calendar: 'orthodox' | 'western' = 'orthodox'): Holiday[] {
  const dates = easter[year];
  if (!dates) return [];
  const fixed = [['01-01', 'New Year'], ['01-02', 'New Year'], ['01-06', 'Epiphany'], ['01-07', 'Saint John'], ['01-24', 'Union Day'], ['05-01', 'Labour Day'], ['06-01', "Children’s Day"], ['08-15', 'Assumption'], ['11-30', 'Saint Andrew'], ['12-01', 'National Day'], ['12-25', 'Christmas'], ['12-26', 'Christmas']];
  const movable = [[-2, 'Good Friday'], [0, 'Easter'], [1, 'Easter Monday'], [49, 'Pentecost'], [50, 'Pentecost Monday']] as const;
  return [...fixed.map(([date, name]) => ({ date: `${year}-${date}`, name: name || '' })), ...movable.map(([offset, name]) => {
    const date = new Date(`${dates[calendar]}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + offset);
    return { date: date.toISOString().slice(0, 10), name };
  })].sort((a, b) => a.date.localeCompare(b.date));
}