export const MAX_COMPANIES = 500;
export const POSTAL_SOURCE_URL = 'https://www.posta-romana.ro/cauta-cod-postal.html';
export type Company = {
  cui: string; name: string; registry: string; fiscal: string;
  vat: boolean | null; cashVat: boolean | null; eInvoice: boolean | null;
  county: string; locality: string; street: string; address: string;
  postalCode: string; postalSource: 'ANAF' | 'Poșta Română' | '';
  postalStatus: 'verified' | 'missing' | 'ambiguous' | 'unavailable';
  status: 'found' | 'not-found' | 'error'; message: string; checkedAt: string;
};
export function validCui(cui: string) {
  if (!/^[1-9]\d{1,9}$/.test(cui)) return false;
  const digits = cui.padStart(10, '0');
  const weights = '753217532';
  const sum = [...weights].reduce((s, w, i) => s + Number(w) * Number(digits[i]), 0);
  const control = (sum * 10) % 11;
  return (control === 10 ? 0 : control) === Number(digits[9]);
}
export function parseCuis(text: string) {
  const tokens = text.trim().split(/[\s,;]+/).filter(Boolean);
  const seen = new Set<string>();
  const cuis: string[] = [], invalid: string[] = [];
  let duplicates = 0;
  for (const token of tokens) {
    const cui = token.replace(/^RO/i, '').replace(/^0+/, '');
    if (!validCui(cui)) { invalid.push(token); continue; }
    if (seen.has(cui)) { duplicates++; continue; }
    seen.add(cui); cuis.push(cui);
  }
  return { cuis, invalid, duplicates, overLimit: cuis.length > MAX_COMPANIES };
}
export function cleanPostalCode(value: unknown) {
  const s = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  return /^\d{6}$/.test(s) && s !== '000000' ? s : '';
}
export function blankCompany(cui: string, status: Company['status'], message: string, checkedAt: string): Company {
  return { cui, name: '', registry: '', fiscal: '', vat: null, cashVat: null, eInvoice: null, county: '', locality: '', street: '', address: '', postalCode: '', postalSource: '', postalStatus: 'missing', status, message, checkedAt };
}
const yesNo = (value: boolean | null) => value === null ? '' : value ? 'Da' : 'Nu';
export function exportRows(companies: Company[]) {
  return companies.map(c => ({
    'CUI / CIF': c.cui, 'Denumire': c.name, 'Nr. Reg. Com.': c.registry,
    'Stare Fiscală': c.fiscal, 'Plătitor TVA': yesNo(c.vat), 'TVA la Încasare': yesNo(c.cashVat),
    'Registru e-Factura': yesNo(c.eInvoice), 'Județ': c.county, 'Localitate': c.locality,
    'Stradă & Număr': c.street, 'Cod Poștal': c.postalCode, 'Adresă Completă': c.address,
    'Sursă Cod Poștal': c.postalSource, 'Verificare Cod Poștal': c.postalStatus,
    'Rezultat': c.status, 'Observații': c.message, 'Verificat la': c.checkedAt,
  }));
}
// Spreadsheet exports must not evaluate values received from external registries as formulas.
export function safeSpreadsheetValue(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}