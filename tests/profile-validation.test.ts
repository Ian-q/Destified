import { describe, it, expect } from 'vitest';
import { isCompleteISODate, findInvalidDateFields } from '@/lib/profile-validation';

describe('isCompleteISODate', () => {
  it('accepts a complete, real ISO date', () => {
    expect(isCompleteISODate('2029-08-15')).toBe(true);
  });

  it('rejects a partial / year-only entry', () => {
    expect(isCompleteISODate('2029')).toBe(false);
    expect(isCompleteISODate('2029-08')).toBe(false);
  });

  it('rejects a calendar-impossible date', () => {
    expect(isCompleteISODate('2029-02-31')).toBe(false);
    expect(isCompleteISODate('2029-13-01')).toBe(false);
  });

  it('rejects empty / garbage', () => {
    expect(isCompleteISODate('')).toBe(false);
    expect(isCompleteISODate('not-a-date')).toBe(false);
  });
});

describe('findInvalidDateFields', () => {
  it('returns nothing when all fields are empty (optional) or complete', () => {
    const bad = findInvalidDateFields([
      { id: 'pass-US', label: 'US passport expiry', value: null, badInput: false },
      { id: 'idp', label: 'IDP expiry', value: '2027-01-01', badInput: false },
    ]);
    expect(bad).toEqual([]);
  });

  it('flags a field the browser reports as a partial/unparseable entry (badInput)', () => {
    // This is the exact issue-#20 case: the control holds "2029" which never
    // reaches React state, so value is null but the date control is mid-edit.
    const bad = findInvalidDateFields([
      { id: 'pass-US', label: 'US passport expiry', value: null, badInput: true },
    ]);
    expect(bad).toEqual([{ id: 'pass-US', label: 'US passport expiry' }]);
  });

  it('flags a stored-but-malformed date value (defense in depth)', () => {
    const bad = findInvalidDateFields([
      { id: 'idp', label: 'IDP expiry', value: '2029-02-31', badInput: false },
    ]);
    expect(bad).toEqual([{ id: 'idp', label: 'IDP expiry' }]);
  });

  it('reports every invalid field, not just the first', () => {
    const bad = findInvalidDateFields([
      { id: 'pass-US', label: 'US passport expiry', value: null, badInput: true },
      { id: 'pass-PH', label: 'PH passport expiry', value: '2030-01-01', badInput: false },
      { id: 'idp', label: 'IDP expiry', value: 'garbage', badInput: false },
    ]);
    expect(bad.map((f) => f.id)).toEqual(['pass-US', 'idp']);
  });
});
