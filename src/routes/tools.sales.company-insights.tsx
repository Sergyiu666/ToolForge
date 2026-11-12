import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { ToolPage, meta } from '@/components/ToolPage';
import { Button } from '@/components/ui/button';
import { validCui } from '@/lib/company';
import { growth, isInsolvency, netResult, type CourtCase, type FinancialYear } from '@/lib/insights';
import { companyProfileFn, courtCasesFn } from '@/lib/insights.functions';

export const Route = createFileRoute('/tools/sales/company-insights')({
  head: () => meta('Company Due Diligence — Toolforge', 'Romanian company check: ANAF fiscal status, 5-year financials and court cases for the company and its administrators.'),
  component: Page,
});

type Profile = Awaited<ReturnType<typeof companyProfileFn>>;
type Cases = { name: string; kind: 'company' | 'person'; loading: boolean; cases: CourtCase[]; total: number; error: string };
const lei = (n: number | null) => n === null ? '—' : `${Math.round(n).toLocaleString('ro-RO')} lei`;
const pct = (n: number | null) => n === null ? '' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const yesNo = (b: boolean | null) => b === null ? 'Unknown' : b ? 'Yes' : 'No';

function Page() {
  const profileFn = useServerFn(companyProfileFn), casesFn = useServerFn(courtCasesFn);
  const [cui, setCui] = useState(''), [admins, setAdmins] = useState('');
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null), [searches, setSearches] = useState<Cases[]>([]);

  async function searchCases(name: string, kind: Cases['kind']) {
    setSearches(s => [...s.filter(x => x.name !== name), { name, kind, loading: true, cases: [], total: 0, error: '' }]);
    try { const r = await casesFn({ data: { name } }); setSearches(s => s.map(x => x.name === name ? { ...x, ...r, loading: false } : x)); }
    catch { setSearches(s => s.map(x => x.name === name ? { ...x, loading: false, error: 'Search failed. Retry.' } : x)); }
  }
  async function run() {
    const id = cui.replace(/^RO/i, '').replace(/\s/g, '');
    if (!validCui(id)) { setError('Enter a valid Romanian CUI (e.g. 14399840).'); return; }
    setError(''); setLoading(true); setProfile(null); setSearches([]);
    try {
      const p = await profileFn({ data: { cui: id } }); setProfile(p);
      if (p.company.status === 'found' && p.company.name) void searchCases(p.company.name, 'company');
      else setError(p.company.message || 'Company not found in ANAF records.');
    } catch { setError('Lookup failed. Please retry.'); } finally { setLoading(false); }
  }
  function runAdmins() {
    const names = admins.split('\n').map(s => s.trim()).filter(s => s.length >= 3).slice(0, 5);
    if (!names.length) { toast.error('Enter at least one full name (min. 3 characters).'); return; }
    names.forEach(n => void searchCases(n, 'person'));
  }

  const c = profile?.company, fy = profile?.years ?? [];
  const companyCases = searches.find(s => s.kind === 'company');
  function brief() {
    if (!c) return '';
    const last = fy[0], prev = fy[1];
    const lines = [
      `${c.name} (CUI ${c.cui}, ${c.registry || 'reg. no. n/a'})`, `Address: ${c.address || '—'}`,
      `Fiscal status: ${c.fiscal || '—'} · VAT payer: ${yesNo(c.vat)} · VAT on cash: ${yesNo(c.cashVat)} · e-Factura: ${yesNo(c.eInvoice)}`,
      last ? `FY${last.year}: turnover ${lei(last.turnover)} ${pct(growth(last.turnover, prev?.turnover ?? null))}, net result ${lei(netResult(last))}, employees ${last.employees ?? '—'}, debts ${lei(last.debts)}` : 'No published financial statements found.',
      ...searches.filter(s => !s.loading).map(s => `Court cases (${s.kind === 'company' ? 'company' : 'potential, name match'} "${s.name}"): ${s.error ? 'unavailable' : `${s.total}, insolvency-related ${s.cases.filter(isInsolvency).length}`}`),
      `Sources: ANAF, portal.just.ro · ${new Date().toISOString().slice(0, 10)}`,
    ];
    return lines.join('\n');
  }
  async function copyBrief() {
    try { await navigator.clipboard.writeText(brief()); toast.success('CRM brief copied'); } catch { toast.error('Could not copy to clipboard.'); }
  }

  return (
    <ToolPage category="sales" categoryName="Sales" title="Company Due Diligence" intro="Check a Romanian company before you sell: fiscal status, 5-year financials and public court cases, with a copy-ready CRM brief.">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={cui} onChange={e => setCui(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} placeholder="CUI, e.g. 14399840" className="flex-1 rounded-xl border bg-input/30 px-4 py-3 text-lg outline-none focus:border-primary" />
        <Button onClick={run} disabled={loading} className="btn-glow h-auto py-3">{loading ? 'Checking…' : 'Check company'}</Button>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {c && c.status === 'found' && <div className="mt-8 space-y-8">
        <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-display text-2xl font-semibold">{c.name}</h2><p className="text-sm text-muted-foreground">CUI {c.cui} · {c.registry || '—'}</p><p className="mt-1 text-sm">{c.address}</p></div>
            <Button variant="outline" onClick={copyBrief}>Copy CRM brief</Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Fiscal status', c.fiscal || '—'], ['VAT payer', yesNo(c.vat)], ['VAT on cash', yesNo(c.cashVat)], ['e-Factura', yesNo(c.eInvoice)]].map(([k, v]) =>
              <div key={k} className={`rounded-xl p-3 ${k === 'Fiscal status' && /inactiv/i.test(v!) ? 'bg-destructive/20' : 'bg-secondary'}`}><div className="text-xs uppercase text-muted-foreground">{k}</div><div className="mt-1 font-semibold">{v}</div></div>)}
          </div>
        </section>

        <section>
          <h3 className="font-display text-lg font-semibold">Financial trend (ANAF published statements)</h3>
          {fy.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No published financial statements for the last five years.</p> :
            <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr>{['Year', 'Turnover', 'Net result', 'Employees', 'Debts', 'Equity', 'Cash'].map(h => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
              <tbody>{fy.map((f: FinancialYear, i) => { const prev = fy[i + 1], nr = netResult(f), g = growth(f.turnover, prev?.turnover ?? null); return (
                <tr key={f.year} className="border-t"><td className="py-2 pr-4 font-semibold">{f.year}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{lei(f.turnover)} {g !== null && <span className={g >= 0 ? 'text-primary' : 'text-destructive'}>{pct(g)}</span>}</td>
                  <td className={`py-2 pr-4 whitespace-nowrap ${nr !== null && nr < 0 ? 'text-destructive' : ''}`}>{lei(nr)}</td>
                  <td className="py-2 pr-4">{f.employees ?? '—'}</td><td className="py-2 pr-4 whitespace-nowrap">{lei(f.debts)}</td><td className="py-2 pr-4 whitespace-nowrap">{lei(f.equity)}</td><td className="py-2 pr-4 whitespace-nowrap">{lei(f.cash)}</td></tr>); })}</tbody></table></div>}
          {profile!.failed.length > 0 && <p className="mt-2 text-xs text-muted-foreground">ANAF did not respond for {profile!.failed.join(', ')}; retry to complete.</p>}
        </section>

        <section>
          <h3 className="font-display text-lg font-semibold">Administrators & connections</h3>
          <p className="mt-1 text-sm text-muted-foreground">Administrator names are not published by ANAF (ONRC data is paid). Enter names from the company's ONRC extract, one per line (max 5), to search public court cases where they appear as a party.</p>
          <textarea value={admins} onChange={e => setAdmins(e.target.value)} rows={3} placeholder={'POPESCU ION\nIONESCU MARIA'} className="mt-3 w-full rounded-xl border bg-input/30 px-4 py-3 outline-none focus:border-primary" />
          <Button variant="outline" className="mt-2" onClick={runAdmins}>Search administrators</Button>
          <p className="mt-2 text-xs text-muted-foreground">Name matches are potential, not definitive: people with the same name may appear. Verify identity before acting on results.</p>
        </section>

        {searches.map(s => <CaseList key={s.name} s={s} />)}
        {!companyCases && <p className="text-sm text-muted-foreground">Court search not started.</p>}
      </div>}
      <p className="mt-8 text-xs text-muted-foreground">Sources: ANAF (webservicesp.anaf.ro) fiscal registry and financial statements, Portalul Instanțelor de Judecată (portal.just.ro). Read-only, nothing is stored.</p>
    </ToolPage>
  );
}

function CaseList({ s }: { s: Cases }) {
  const [all, setAll] = useState(false);
  const ins = s.cases.filter(isInsolvency).length, shown = all ? s.cases : s.cases.slice(0, 10);
  return (
    <section>
      <h3 className="font-display text-lg font-semibold">Court cases — {s.name} {s.kind === 'person' && <span className="text-xs font-normal text-muted-foreground">(potential matches)</span>}</h3>
      {s.loading ? <p className="mt-2 text-sm text-muted-foreground">Searching the courts portal… this can take up to 30 seconds.</p> : s.error ? <p className="mt-2 text-sm text-destructive">{s.error}</p> : <>
        <p className="mt-1 text-sm">{s.total} case(s) found{ins > 0 && <span className="text-destructive"> · {ins} insolvency-related</span>}{s.total > s.cases.length && ` (showing latest ${s.cases.length})`}</p>
        <div className="mt-2 space-y-2">{shown.map(k => <div key={k.number + k.court} className={`rounded-lg border p-3 text-sm ${isInsolvency(k) ? 'border-destructive/60' : ''}`}>
          <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{k.number}</span><span className="text-muted-foreground">{k.date} · {k.court}</span></div>
          <div className="mt-1">{k.subject || '—'}</div>
          <div className="mt-1 text-xs text-muted-foreground">{[k.category, k.stage, k.role && `as ${k.role}`, s.kind === 'person' && k.party].filter(Boolean).join(' · ')}</div></div>)}</div>
        {s.cases.length > 10 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${s.cases.length}`}</Button>}
      </>}
    </section>
  );
}
