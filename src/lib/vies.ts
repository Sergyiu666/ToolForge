import { validCui } from './company';

export const VIES_COUNTRIES = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI'] as const;
export type ViesResult = { status: 'valid' | 'invalid' | 'unavailable'; checkedAt: string; name: string; address: string; message: string };
export function vatIdentity(input: string) {
  const value = input.toUpperCase().replace(/^GR/, 'EL');
  if (/^\d+$/.test(value) || value.startsWith('RO')) {
    const number = value.replace(/^RO/, '').replace(/^0+/, '');
    return validCui(number) ? { country: 'RO', number, key: number } : null;
  }
  const country = value.slice(0, 2), number = value.slice(2);
  if (!VIES_COUNTRIES.some(c => c === country) || !/^[A-Z0-9]{2,12}$/.test(number)) return null;
  return { country, number, key: country + number };
}
export function parseVatInputs(text: string) {
  const cuis: string[] = [], invalid: string[] = [];
  const seen = new Set<string>(); let duplicates = 0;
  for (const token of text.trim().split(/[\s,;]+/).filter(Boolean)) {
    const identity = vatIdentity(token);
    if (!identity) { invalid.push(token); continue; }
    if (seen.has(identity.key)) { duplicates++; continue; }
    seen.add(identity.key); cuis.push(identity.key);
  }
  return { cuis, invalid, duplicates, overLimit: cuis.length > 500 };
}