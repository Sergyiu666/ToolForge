import { expect, it } from 'vitest';
import { romanianHolidays } from './holidays';
import { workingDays } from './calc';
it.each([2024, 2025, 2026, 2027])('includes all 17 statutory holidays for %s', year => {
  const holidays = romanianHolidays(year);
  expect(holidays).toHaveLength(17);
  for (const day of ['01-01', '01-02', '01-06', '01-07', '01-24', '05-01', '06-01', '08-15', '11-30', '12-01', '12-25', '12-26']) expect(holidays.some(h => h.date === `${year}-${day}`)).toBe(true);
});
it.each([[2024, '2024-05-05', '2024-05-03', '2024-06-24'], [2025, '2025-04-20', '2025-04-18', '2025-06-09'], [2026, '2026-04-12', '2026-04-10', '2026-06-01'], [2027, '2027-05-02', '2027-04-30', '2027-06-21']] as const)('uses verified Orthodox movable dates in %s', (year, easter, friday, pentecostMonday) => {
  const rows = romanianHolidays(year);
  expect(rows.find(h => h.name === 'Easter')?.date).toBe(easter);
  expect(rows.find(h => h.name === 'Good Friday')?.date).toBe(friday);
  expect(rows.find(h => h.name === 'Pentecost Monday')?.date).toBe(pentecostMonday);
});
it('deduplicates overlapping public and custom holidays without moving weekend holidays', () => {
  const holidays = romanianHolidays(2026).map(h => h.date);
  expect(workingDays('2026-06-01', '2026-06-05', [...holidays, '2026-06-01'])).toEqual({ working: 4, weekend: 0, holidays: 1 });
  expect(workingDays('2026-01-01', '2026-01-31', holidays)).toEqual({ working: 18, weekend: 9, holidays: 4 });
});
it('supports Western Christian dates and refuses to guess years outside coverage', () => {
  expect(romanianHolidays(2026, 'western').find(h => h.name === 'Easter')?.date).toBe('2026-04-05');
  expect(romanianHolidays(2028)).toEqual([]);
});