import { describe, expect, it } from 'vitest';
import { paymentDue } from './payment';

describe('payment due dates and contractual penalties', () => {
  it('adds calendar days across month boundaries', () => {
    expect(paymentDue('2026-01-31', 30, '2026-03-02', 1000, 0.1)?.dueDate).toBe('2026-03-02');
  });
  it('charges no penalty on the due date', () => {
    expect(paymentDue('2026-10-01', 10, '2026-10-11', 1000, 0.1)?.penalty).toBe(0);
  });
  it('uses simple daily penalties from the day after the due date', () => {
    expect(paymentDue('2026-10-01', 10, '2026-10-21', 1000, 0.1)).toEqual({ dueDate: '2026-10-11', overdue: 10, penalty: 10, total: 1010 });
  });
  it('handles leap dates without local time shifts', () => {
    expect(paymentDue('2028-02-28', 1, '2028-03-01', 100, 1)?.overdue).toBe(1);
  });
  it('rejects impossible dates, fractional terms and negative amounts', () => {
    expect(paymentDue('2026-02-30', 30, '2026-04-01', 100, 1)).toBeNull();
    expect(paymentDue('2026-01-01', 1.5, '2026-04-01', 100, 1)).toBeNull();
    expect(paymentDue('2026-01-01', 30, '2026-04-01', -100, 1)).toBeNull();
  });
});