import { parseCourtCases, parseFinancials, type CourtCase, type FinancialYear } from './insights';

export async function fetchFinancials(cui: string, years: number[]): Promise<{ years: FinancialYear[]; failed: number[] }> {
  const res = await Promise.all(years.map(async year => {
    try {
      const r = await fetch(`https://webservicesp.anaf.ro/bilant?an=${year}&cui=${cui}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { year, data: parseFinancials(await r.json(), year), ok: true };
    } catch (e) { console.error('ANAF bilant failed', year, e instanceof Error ? e.message : ''); return { year, data: null, ok: false }; }
  }));
  return { years: res.flatMap(r => r.data ? [r.data] : []).sort((a, b) => b.year - a.year), failed: res.filter(r => !r.ok).map(r => r.year) };
}

const esc = (s: string) => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
export async function fetchCourtCases(name: string): Promise<{ cases: CourtCase[]; total: number; error: string }> {
  const body = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><CautareDosare xmlns="portalquery.just.ro"><numeParte>${esc(name)}</numeParte></CautareDosare></soap:Body></soap:Envelope>`;
  try {
    const r = await fetch('http://portalquery.just.ro/query.asmx', {
      method: 'POST', body, signal: AbortSignal.timeout(40000),
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '"portalquery.just.ro/CautareDosare"' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const cases = parseCourtCases(await r.text(), name);
    return { cases: cases.slice(0, 200), total: cases.length, error: '' };
  } catch (e) {
    console.error('portal.just.ro failed', e instanceof Error ? e.message : '');
    return { cases: [], total: 0, error: 'The courts portal could not be reached. Retry later; no cases have been inferred.' };
  }
}
