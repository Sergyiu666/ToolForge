import { cleanPostalCode } from './company';
export type PostalCandidate = { code: string; county: string; locality: string; street: string };
export const normalizeAddress = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[şș]/g, 's').replace(/[ţț]/g, 't').toLowerCase().replace(/\b(strada|str\.?|municipiul|mun\.?|judetul|jud\.?)\s*/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const text = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
export function parsePostalHtml(html: string): PostalCandidate[] {
  return html.split(/<div[^>]*class="[^"]*cod-postal-line[^"]*"[^>]*>/).slice(1).flatMap(row => {
    const cells = [...row.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => text(m[1]));
    const code = cleanPostalCode(cells[0]);
    return code && cells.length >= 4 ? [{ code, county: cells[1], locality: cells[2], street: cells[3] }] : [];
  });
}
export function matchPostal(candidates: PostalCandidate[], county: string, locality: string, street: string, number: string) {
  const matches = candidates.filter(c => {
    if (normalizeAddress(c.county) !== normalizeAddress(county) || normalizeAddress(c.locality) !== normalizeAddress(locality)) return false;
    const [name, range] = c.street.split(/\s+nr\.?\s*/i);
    if (normalizeAddress(name) !== normalizeAddress(street)) return false;
    if (!range) return true;
    if (!/^\d+$/.test(number.trim())) return false;
    const n = Number(number);
    const exact = range.trim().match(/^(\d+)$/);
    if (exact) return n === Number(exact[1]);
    const span = range.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (!span) return false;
    const start = Number(span[1]), end = Number(span[2]);
    return n >= start && n <= end && (start % 2 !== end % 2 || n % 2 === start % 2);
  });
  const codes = [...new Set(matches.map(c => c.code))];
  return { code: codes.length === 1 ? codes[0] : '', ambiguous: codes.length > 1 || (candidates.length > 0 && codes.length === 0) };
}