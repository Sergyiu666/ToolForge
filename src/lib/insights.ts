// Client-safe parsing for public ANAF financial statements and portal.just.ro court cases.
export type FinancialYear = {
  year: number; turnover: number | null; revenue: number | null; expenses: number | null;
  netProfit: number | null; netLoss: number | null; employees: number | null;
  debts: number | null; equity: number | null; cash: number | null;
};
export type CourtCase = { number: string; date: string; court: string; category: string; stage: string; subject: string; role: string; party: string };

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const LEGAL = new Set(['SC', 'S', 'C', 'SRL', 'SA', 'R', 'L', 'SCS', 'SNC', 'PFA', 'II', 'IF', 'SCA']);
/** Name tokens without legal-form noise, used for conservative party matching. */
export const nameKey = (s: string) => norm(s).split(' ').filter(t => t && !LEGAL.has(t)).join(' ');

// Indicator codes shift between form types and years, so match on the official label text.
const LABELS: [keyof Omit<FinancialYear, 'year'>, RegExp][] = [
  ['turnover', /^CIFRA DE AFACERI NETA/], ['revenue', /^VENITURI TOTALE/], ['expenses', /^CHELTUIELI TOTALE/],
  ['netProfit', /^PROFIT NET/], ['netLoss', /^PIERDERE NETA/], ['employees', /^NUMAR MEDIU DE SALARIATI/],
  ['debts', /^DATORII/], ['equity', /^CAPITALURI TOTAL/], ['cash', /^CASA SI CONTURI LA BANCI/],
];
export function parseFinancials(json: unknown, year: number): FinancialYear | null {
  const rows = json && typeof json === 'object' && Array.isArray((json as Record<string, unknown>)['i']) ? (json as Record<string, unknown[]>)['i'] : null;
  if (!rows || rows.length === 0) return null;
  const out: FinancialYear = { year, turnover: null, revenue: null, expenses: null, netProfit: null, netLoss: null, employees: null, debts: null, equity: null, cash: null };
  for (const r of rows) {
    const row = (r ?? {}) as Record<string, unknown>;
    const label = norm(String(row['val_den_indicator'] ?? '')), v = Number(row['val_indicator']);
    if (!Number.isFinite(v)) continue;
    const hit = LABELS.find(([, re]) => re.test(label));
    if (hit && out[hit[0]] === null) out[hit[0]] = v;
  }
  return out;
}
/** Net result: profit positive, loss negative; null when neither is published. */
export const netResult = (f: FinancialYear) => f.netProfit === null && f.netLoss === null ? null : (f.netProfit ?? 0) - (f.netLoss ?? 0);
export function growth(curr: number | null, prev: number | null) {
  if (curr === null || prev === null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1]!.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim() : '';
};
/** Keeps only cases where a party name contains every token of the searched name. */
export function parseCourtCases(xml: string, query: string): CourtCase[] {
  const key = nameKey(query).split(' ').filter(Boolean);
  if (!key.length) return [];
  const cases: CourtCase[] = [];
  for (const block of xml.split('<Dosar>').slice(1)) {
    const parti = block.match(/<parti>([\s\S]*?)<\/parti>/)?.[1] ?? '';
    const party = parti.split('<DosarParte>').slice(1).map(p => ({ name: tag(p, 'nume'), role: tag(p, 'calitateParte') }))
      .find(p => { const t = new Set(nameKey(p.name).split(' ')); return key.every(k => t.has(k)); });
    if (!party) continue;
    const head = block.replace(/<parti>[\s\S]*?<\/parti>|<sedinte>[\s\S]*?<\/sedinte>|<caiAtac>[\s\S]*?<\/caiAtac>/g, '');
    cases.push({
      number: tag(head, 'numar'), date: tag(head, 'data').slice(0, 10), court: tag(head, 'institutie').replace(/([a-z])([A-Z])/g, '$1 $2'),
      category: tag(head, 'categorieCazNume') || tag(head, 'categorieCaz'), stage: tag(head, 'stadiuProcesualNume') || tag(head, 'stadiuProcesual'),
      subject: tag(head, 'obiect'), role: party.role, party: party.name,
    });
  }
  return cases.sort((a, b) => b.date.localeCompare(a.date));
}
const INSOLVENCY = /INSOLVEN|FALIMENT|REORGANIZAR|LICHIDAR/;
export const isInsolvency = (c: CourtCase) => INSOLVENCY.test(norm(`${c.category} ${c.subject}`));
