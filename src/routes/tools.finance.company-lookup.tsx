import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Search, Upload, FileSpreadsheet, Download, ArrowUpRight, Loader2, ShieldCheck, MapPin, ChevronRight, Square } from 'lucide-react';
import { SiteShell } from '@/components/SiteShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { lookupCompaniesFn } from '@/lib/company.functions';
import { exportRows, MAX_COMPANIES, parseCuis, POSTAL_SOURCE_URL, safeSpreadsheetValue, validLookupDate, type Company } from '@/lib/company';

const title = 'ANAF Bulk Company Lookup — Toolforge';
const description = 'Look up Romanian companies by CUI, check VAT and addresses, resolve missing postal codes from Poșta Română, and export CSV or Excel.';
export const Route = createFileRoute('/tools/finance/company-lookup')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: CompanyLookup,
});
const flag = (v: boolean | null) => v === null ? 'Unknown' : v ? 'Yes' : 'No';
const postalLabel = (c: Company) => c.postalCode ? c.postalSource : c.postalStatus === 'ambiguous' ? 'Needs review' : c.postalStatus === 'unavailable' ? 'Source unavailable' : 'Not resolved';

function CompanyLookup() {
  const lookup = useServerFn(lookupCompaniesFn);
  const [input, setInput] = useState('');
  const [date, setDate] = useState('');
  const [postal, setPostal] = useState(true);
  const [rows, setRows] = useState<Company[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Company | null>(null);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<string[][] | null>(null);
  const [column, setColumn] = useState(0);
  const [hasHeader, setHasHeader] = useState(true);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);
  useEffect(() => { setDate(new Date().toISOString().slice(0, 10)); return () => { stopRef.current = true; }; }, []);
  const parsed = useMemo(() => parseCuis(input), [input]);
  const found = rows.filter(r => r.status === 'found').length;
  const resolved = rows.filter(r => r.postalCode).length;
  const review = rows.filter(r => r.status !== 'found' || !r.postalCode).length;
  const filtered = rows.filter(r => (filter === 'all' || filter === 'review' && (r.status !== 'found' || !r.postalCode) || filter === 'vat' && r.vat === true) && `${r.cui} ${r.name} ${r.locality}`.toLowerCase().includes(query.toLowerCase()));

  async function readFile(file: File) {
    setError('');
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { setError('Choose a CSV, XLSX or XLS file.'); return; }
    if (file.size > 10_000_000) { setError('The file must be smaller than 10 MB.'); return; }
    try {
      const XLSX = await import('xlsx');
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array', sheetRows: 10002 });
      const first = book.SheetNames[0];
      if (!first) throw new Error('No worksheet');
      const worksheet = book.Sheets[first];
      if (!worksheet) throw new Error('No worksheet');
      const table = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false, defval: '' }).map(row => row.map(String)).filter(row => row.some(Boolean));
      if (!table.length) throw new Error('Empty worksheet');
      const detected = table[0]?.findIndex(v => /^(cui|cif|cod fiscal|vat|tax id)(\b|$)/i.test(v.trim())) ?? -1;
      setColumn(detected >= 0 ? detected : 0); setHasHeader(detected >= 0); setFileName(file.name); setSheet(table);
    } catch { setError('This spreadsheet could not be read. Check the file and try again.'); }
  }
  async function search(cuis = parsed.cuis) {
    if (!cuis.length || cuis.length > MAX_COMPANIES || !date) return;
    if (!validLookupDate(date)) { setError('Choose a valid lookup date, today or earlier.'); return; }
    setFilter('all'); setQuery(''); setSelected(null);
    setError(''); setRunning(true); setRows([]); stopRef.current = false;
    setProgress({ done: 0, total: cuis.length });
    let accumulated: Company[] = [];
    try {
      for (let i = 0; i < cuis.length; i += 10) {
        if (stopRef.current) break;
        const batch = await lookup({ data: { cuis: cuis.slice(i, i + 10), date, postal } });
        accumulated = [...accumulated, ...batch];
        setRows(accumulated); setProgress({ done: accumulated.length, total: cuis.length });
        if (batch.every(r => r.status === 'error')) { setError('ANAF is unavailable. Your CUIs are unchanged; retry when the service is back.'); break; }
        if (stopRef.current) break;
        if (i + 10 < cuis.length) await new Promise(resolve => setTimeout(resolve, 1100));
      }
    } catch { setError('The lookup was interrupted. Completed results are still available; you can retry.'); }
    finally { setRunning(false); }
  }
  async function download(format: 'csv' | 'xlsx') {
    setExporting(true); setError('');
    try {
      const XLSX = await import('xlsx');
      const data = exportRows(filtered).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeSpreadsheetValue(value)])));
      const sheet = XLSX.utils.json_to_sheet(data);
      if (format === 'xlsx') { const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Companies'); XLSX.writeFile(book, `anaf-companies-${date}.xlsx`); }
      else {
        const url = URL.createObjectURL(new Blob(['\uFEFF', XLSX.utils.sheet_to_csv(sheet)], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = `anaf-companies-${date}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch { setError('The export failed. Please try again.'); }
    finally { setExporting(false); }
  }
  return <SiteShell>
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <Link to="/tools/$category" params={{ category: 'finance' }} className="text-sm text-muted-foreground hover:text-foreground">← Finance & Accounting</Link>
      <div className="mt-8 flex flex-wrap items-start justify-between gap-4 border-b pb-8">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase text-primary"><Building2 className="size-4" /> Romanian company registers</div><h1 className="font-display text-3xl font-semibold sm:text-4xl">ANAF <span className="text-gradient">Company Lookup</span></h1><p className="mt-3 text-muted-foreground">Company details, VAT status and complete addresses.</p></div>
        <a href="https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt" target="_blank" rel="noreferrer" className="flex items-center gap-2 border-l pl-4 text-xs text-muted-foreground"><ShieldCheck className="size-5 text-primary" /><span>Official sources<br /><span className="text-foreground">ANAF · Poșta Română</span></span><ArrowUpRight className="size-3" /></a>
      </div>
      <div className="grid gap-8 py-8 lg:grid-cols-[1.7fr_1fr]">
        <div><div className="mb-3 flex items-center justify-between"><label htmlFor="cuis" className="font-medium">Company CUIs</label><span className="text-xs text-muted-foreground">{parsed.cuis.length} / 500</span></div><Textarea id="cuis" value={input} onChange={e => setInput(e.target.value)} disabled={running} placeholder={'RO14399840\n160796\n1590082'} className="min-h-40 resize-y rounded-lg bg-card font-mono text-sm" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">One per line, comma or space separated · RO prefix accepted</span><Button variant="ghost" size="sm" disabled={running} onClick={() => setInput('14399840\n160796')}>Use sample CUIs</Button></div>
          {parsed.invalid.length > 0 && <p className="mt-2 break-words text-xs text-destructive">{parsed.invalid.length} invalid entries excluded: {parsed.invalid.slice(0, 8).join(', ')}{parsed.invalid.length > 8 ? '…' : ''}</p>}
          {parsed.duplicates > 0 && <p className="mt-2 text-xs text-muted-foreground">{parsed.duplicates} duplicates removed.</p>}
          {parsed.overLimit && <p className="mt-2 text-sm text-destructive">Limit this search to 500 unique valid CUIs.</p>}
        </div>
        <div className="flex flex-col gap-5"><div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && !running) void readFile(file); }} className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/40 px-5 py-6 text-center"><Upload className="size-6 text-primary" /><Button variant="outline" disabled={running} onClick={() => fileRef.current?.click()}>Import company list</Button><span className="text-xs text-muted-foreground">Drop CSV, XLSX or XLS · up to 10 MB</span><input aria-label="Upload company list" ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void readFile(file); e.target.value = ''; }} /></div><label className="flex items-center justify-between gap-3 text-sm" htmlFor="lookup-date">Lookup date<Input id="lookup-date" type="date" value={date} onChange={e => setDate(e.target.value)} disabled={running} className="w-40 rounded-md" /></label></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y py-5"><div className="flex items-center gap-3"><Switch id="resolve-postal" checked={postal} onCheckedChange={setPostal} disabled={running} /><label htmlFor="resolve-postal" className="text-sm"><span className="block font-medium">Resolve missing postal codes</span><span className="text-xs text-muted-foreground">Poșta Română · exact matches only; uncertain addresses stay flagged</span></label></div><div className="flex gap-2">{running ? <Button variant="outline" onClick={() => { stopRef.current = true; }}><Square />Stop after this batch</Button> : null}<Button size="lg" disabled={running || !parsed.cuis.length || parsed.overLimit || !date} onClick={() => void search()}>{running ? <Loader2 className="animate-spin" /> : <Search />}{running ? `${progress.done} / ${progress.total}` : 'Look up companies'}</Button></div></div>
      {error && <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      <section className="mt-9">
        <div className="mb-6 grid grid-cols-3 divide-x border-b pb-6">{[['Companies found', found], ['Postal codes resolved', resolved], ['Need review', review]].map(([label, n]) => <div key={label} className="px-3 first:pl-0"><div className="font-display text-3xl font-semibold">{n}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>)}</div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">Results <span className="ml-2 text-sm font-normal text-muted-foreground">{filtered.length ? `${filtered.length} companies` : ''}</span></h2><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!filtered.length || exporting || running} onClick={() => void download('csv')}><Download />CSV</Button><Button variant="outline" size="sm" disabled={!filtered.length || exporting || running} onClick={() => void download('xlsx')}><FileSpreadsheet />Excel</Button></div></div>
        {rows.length > 0 ? <><div className="mb-4 flex flex-wrap justify-between gap-3"><div className="flex gap-1" role="group" aria-label="Result filter">{[['all', 'All'], ['vat', 'VAT payers'], ['review', 'Needs review']].map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? 'secondary' : 'ghost'} onClick={() => setFilter(value ?? 'all')}>{label}</Button>)}</div><Input aria-label="Search results" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, CUI, city…" className="w-full rounded-md sm:w-64" /></div><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-secondary/50 text-xs text-muted-foreground"><tr>{['Company / CUI', 'VAT payer', 'County / Locality', 'Street & number', 'Postal code', ''].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{filtered.map(c => <tr key={c.cui} className="border-t hover:bg-muted/40"><td className="max-w-64 px-4 py-4"><Button variant="link" className="h-auto max-w-60 whitespace-normal p-0 text-left text-foreground" onClick={() => setSelected(c)}>{c.name || (c.status === 'error' ? 'Lookup unavailable' : 'Company not found')}</Button><div className="mt-1 font-mono text-xs text-muted-foreground">{c.cui}</div></td><td className="px-4 py-4"><span className={c.vat ? 'text-primary' : 'text-muted-foreground'}>{flag(c.vat)}</span></td><td className="px-4 py-4">{c.county || '—'}<div className="text-xs text-muted-foreground">{c.locality}</div></td><td className="max-w-60 px-4 py-4 text-muted-foreground">{c.street || '—'}</td><td className="px-4 py-4"><div className="font-mono">{c.postalCode || '—'}</div><div className={`mt-1 text-xs ${c.postalCode ? 'text-primary' : 'text-muted-foreground'}`}>{postalLabel(c)}</div></td><td className="px-2"><Button variant="ghost" size="icon" aria-label={`Details for ${c.cui}`} onClick={() => setSelected(c)}><ChevronRight /></Button></td></tr>)}</tbody></table>{!filtered.length && <p className="p-8 text-center text-sm text-muted-foreground">No companies match this filter.</p>}</div></> : <div className="flex min-h-48 flex-col items-center justify-center gap-3 border-y border-dashed py-8 text-muted-foreground"><Building2 className="size-8 text-primary/70" /><p className="text-sm">{running ? 'Waiting for ANAF…' : 'No company lookups yet'}</p></div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Unresolved postal codes are never guessed.</span><a href={POSTAL_SOURCE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground">Poșta Română postal search<ArrowUpRight className="size-3" /></a></div>
      </section>
    </div>
    <Dialog open={Boolean(sheet)} onOpenChange={open => { if (!open) setSheet(null); }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Import company list</DialogTitle></DialogHeader><p className="break-all text-sm text-muted-foreground">{fileName} · {sheet?.length} rows</p><label className="text-sm">CUI column<select aria-label="CUI column" className="mt-2 w-full rounded-md border bg-background p-2" value={column} onChange={e => setColumn(Number(e.target.value))}>{Array.from({ length: Math.max(...(sheet?.slice(0, 5).map(r => r.length) || [1])) }, (_, i) => <option key={i} value={i}>{`Column ${i + 1}${hasHeader ? ` — ${sheet?.[0]?.[i] || ''}` : ''}`}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasHeader} onChange={e => setHasHeader(e.target.checked)} />First row contains headings</label><div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><tbody>{sheet?.slice(hasHeader ? 1 : 0, hasHeader ? 6 : 5).map((row, i) => <tr key={i} className="border-b"><td className="p-2 font-mono">{row[column] || '—'}</td></tr>)}</tbody></table></div><Button onClick={() => { setInput(sheet?.slice(hasHeader ? 1 : 0).map(r => r[column] || '').join('\n') || ''); setSheet(null); }}>Import CUIs</Button></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="pr-5 font-display">{selected?.name || `CUI ${selected?.cui}`}</DialogTitle></DialogHeader>{selected && <><p className="font-mono text-sm text-muted-foreground">CUI {selected.cui} · {selected.registry || 'Registration number unavailable'}</p>{selected.message && <p className="text-sm text-destructive">{selected.message}</p>}<dl className="grid grid-cols-2 gap-5 border-y py-5">{[['Fiscal status', selected.fiscal || 'Unknown'], ['VAT payer', flag(selected.vat)], ['Cash VAT', flag(selected.cashVat)], ['e-Factura registry', flag(selected.eInvoice)], ['County', selected.county || '—'], ['Locality', selected.locality || '—']].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}</dl><div><h3 className="flex items-center gap-2 text-sm font-medium"><MapPin className="size-4 text-primary" />Registered address</h3><p className="mt-2 text-sm text-muted-foreground">{selected.address || 'Address unavailable'}</p></div><div className="flex justify-between gap-3 rounded-md bg-muted p-4"><div><p className="text-xs text-muted-foreground">Postal code</p><p className="mt-1 font-mono text-lg">{selected.postalCode || 'Not resolved'}</p></div><span className="text-xs text-muted-foreground">{postalLabel(selected)}</span></div><a href={POSTAL_SOURCE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary">Check with Poșta Română<ArrowUpRight className="size-3" /></a><p className="text-xs text-muted-foreground">Source: ANAF · Lookup date {date}<br />Checked {selected.checkedAt.replace('T', ' ').slice(0, 19)} UTC</p></>}</DialogContent></Dialog>
  </SiteShell>;
}