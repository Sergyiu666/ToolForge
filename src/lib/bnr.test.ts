import { describe, expect, it } from 'vitest';
import { convert, parseBnrXml, pickDay } from './bnr';
import { vacationBalance } from './vacation';

const xml = `<Body><Cube date="2026-11-06"><Rate currency="EUR">5.0000</Rate></Cube><Cube date="2026-11-09"><Rate currency="EUR">5.1000</Rate><Rate currency="HUF" multiplier="100">1.2500</Rate><Rate currency="USD">4.2500</Rate></Cube></Body>`;
describe('BNR rates', () => {
  it('parses multipliers and picks the last published day', () => {
    const days = parseBnrXml(xml);
    expect(days[1].rates.HUF).toBeCloseTo(0.0125);
    expect(pickDay(days, '2026-11-08')!.date).toBe('2026-11-06');
    expect(convert(100, 'EUR', 'USD', days[1].rates)).toBeCloseTo(120);
  });
});
describe('vacation balance', () => {
  it('excludes weekends, RO holidays and overlaps', () => {
    // 2026-11-30 & 12-01 are holidays; 11-28/29 weekend
    const r = vacationBalance(21, 2, [{ start: '2026-11-26', end: '2026-12-02' }, { start: '2026-12-02', end: '2026-12-02' }]);
    expect(r.rows.map(x => x.days)).toEqual([3, 0]);
    expect(r.remaining).toBe(20);
  });
});
