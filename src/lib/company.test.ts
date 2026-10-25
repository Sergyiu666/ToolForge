import { describe, expect, it } from 'vitest';
import { blankCompany, cleanPostalCode, exportRows, MAX_COMPANIES, parseCuis, safeSpreadsheetValue, validLookupDate } from './company';
describe('bulk company input', () => {
  it('rejects impossible calendar dates and future lookups', () => {
    expect(validLookupDate('2024-02-31', '2026-10-25')).toBe(false);
    expect(validLookupDate('2026-10-26', '2026-10-25')).toBe(false);
    expect(validLookupDate('2024-02-29', '2026-10-25')).toBe(true);
  });
  it('normalizes RO prefixes and separators and removes duplicates', () => {
    expect(parseCuis('RO14399840, 1590082;14399840\nRO1590082')).toMatchObject({ cuis: ['14399840', '1590082'], duplicates: 2, invalid: [] });
  });
  it('flags invalid CUIs', () => { expect(parseCuis('bad 14399841').invalid).toEqual(['bad', '14399841']); });
  it('limits one search to 500 companies', () => { expect(MAX_COMPANIES).toBe(500); });
});
describe('postal codes and exports', () => {
  it('preserves six-digit postal codes including leading zeros', () => { expect(cleanPostalCode('010101')).toBe('010101'); });
  it('does not invent codes from missing or incomplete data', () => { expect(cleanPostalCode(null)).toBe(''); expect(cleanPostalCode('10101')).toBe(''); expect(cleanPostalCode('000000')).toBe(''); });
  it('exports county, locality and street separately', () => {
    const c = { ...blankCompany('14399840', 'found', '', '2026-10-24'), county: 'București', locality: 'Sector 1', street: 'Strada Test 1', postalCode: '010101' };
    expect(exportRows([c])[0]).toMatchObject({ 'Județ': 'București', 'Localitate': 'Sector 1', 'Stradă & Număr': 'Strada Test 1', 'Cod Poștal': '010101' });
  });
  it('neutralizes spreadsheet formulas', () => { expect(safeSpreadsheetValue('=HYPERLINK("bad")')).toBe('\'=HYPERLINK("bad")'); });
});