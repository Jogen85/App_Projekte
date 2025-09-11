import { describe, it, expect } from 'vitest';
import { daysBetween, overlapDays, plannedBudgetForYearD, toDate } from './lib';

describe('date helpers', () => {
  it('parses and computes daysBetween for DD.MM.YYYY', () => {
    expect(daysBetween('01.01.2025', '31.12.2025')).toBe(364);
  });
  it('computes overlapDays correctly', () => {
    const s1 = toDate('2025-01-01');
    const e1 = toDate('2025-12-31');
    const s2 = toDate('2025-06-01');
    const e2 = toDate('2025-06-11');
    expect(overlapDays(s1, e1, s2, e2)).toBe(10);
  });
  it('plannedBudgetForYearD returns full budget on full-overlap', () => {
    const p = { startD: toDate('2025-01-01'), endD: toDate('2025-12-31'), budgetPlanned: 36500 } as any;
    expect(plannedBudgetForYearD(p, 2025)).toBe(36500);
  });
});
