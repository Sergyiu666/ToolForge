import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { SiteShell } from '@/components/SiteShell';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Plus, Save, Scissors, Trash2, Upload, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { accountSource, blankAllocation, blankInvoice, blankLine, codesFromRows, csvText, exportKeys, exportRows, ifsProfile, initialWorkspace, invoiceFromRows, omfpAccounts, parseInvoiceXml, reviewIssues, suggestion, workspaceSchema, type Allocation, type Code, type InvoiceLine, type Workspace } from '@/lib/invoice-review';
import { SpreadsheetImport, inputClass, type ImportTarget, type SheetData } from './SpreadsheetImport';
import { ReferenceEditor } from './ReferenceEditor';
import { fmt } from '@/components/ToolPage';

const storageKey = 'toolforge-invoice-review-v1';
const download = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
function CodeSelect({ label, value, options, onChange }: { label: string; value: string; options: Code[]; onChange: (v: string) => void }) {
  return <label className="min-w-0 text-xs text-muted-foreground">{label}<select className={`${inputClass} mt-1`} aria-label={label} value={value} onChange={e => onChange(e.target.value)}><option value="">—</option>{value && !options.some(c => c.code === value) && <option value={value}>{value} · invalid</option>}{options.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select></label>;
}
export function InvoiceReview() {
  const [w, setW] = useState<Workspace>(initialWorkspace);
  const [tab, setTab] = useState('review');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ sheets: SheetData[]; target: ImportTarget } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<ImportTarget>('invoice');
  useEffect(() => { try { const raw = localStorage.getItem(storageKey); if (raw) { const parsed = workspaceSchema.safeParse(JSON.parse(raw)); if (parsed.success) { setW(parsed.data); setSaved(true); } else setError('Saved workspace is invalid. Start a new invoice or clear the saved copy.'); } } catch { setError('Browser storage is unavailable. You can still review and export.'); } }, []);
  const change = (f: (w: Workspace) => Workspace) => { setW(f); setSaved(false); };
  const invoice = w.invoice;
  const issues = reviewIssues(w);
  const updateLine = (id: string, f: (l: InvoiceLine) => InvoiceLine) => change(s => ({ ...s, invoice: { ...s.invoice, lines: s.invoice.lines.map(l => l.id === id ? f(l) : l) } }));
  const updateAllocation = (id: string, index: number, patch: Partial<Allocation>) => updateLine(id, l => ({ ...l, allocations: l.allocations.map((a, i) => i === index ? { ...a, ...patch } : a) }));
  const choose = (target: ImportTarget) => { targetRef.current = target; fileRef.current?.click(); };
  const importFile = async (file: File) => {
    setError(''); setPending(null); setBusy(true);
    try {
      if (file.size > 10_000_000) throw new Error('File exceeds 10 MB.');
      if (/\.xml$/i.test(file.name)) {
        if (targetRef.current !== 'invoice') throw new Error('Use CSV or Excel for reference lists.');
        const next = parseInvoiceXml(await file.text());
        if (invoice.lines.length && !window.confirm('Replace the current invoice?')) return;
        change(s => ({ ...s, invoice: next })); setTab('review'); toast.success('Invoice imported');
      } else {
        if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Use an XML invoice or CSV/Excel file. Images and PDFs require the separate AI reader.');
        const XLSX = await import('xlsx');
        const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
        const sheets = book.SheetNames.map(name => ({ name, rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[name], { defval: '', raw: false }) }));
        setPending({ sheets, target: targetRef.current });
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not import file.'); } finally { setBusy(false); }
  };
  const applyImport = (rows: Record<string, unknown>[], mapping: Record<string, string>) => {
    if (!pending) return;
    try {
      if (pending.target === 'invoice') {
        const next = invoiceFromRows(rows, mapping);
        if (invoice.lines.length && !window.confirm('Replace the current invoice?')) return;
        change(s => ({ ...s, invoice: next })); setTab('review');
      } else {
        const codes = codesFromRows(rows, mapping.code, mapping.name);
        if (!window.confirm(`Replace the ${pending.target} list with ${codes.length} entries?`)) return;
        change(s => ({ ...s, [pending.target]: codes }));
      }
      setPending(null); setError(''); toast.success('Import complete');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not import rows.'); }
  };
  const doExport = async (excel: boolean) => {
    try {
      const rows = exportRows(w);
      if (excel) { const XLSX = await import('xlsx'); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Invoice assignments'); XLSX.writeFile(book, 'invoice-assignments.xlsx'); }
      else download(new Blob([csvText(rows, w.profile.delimiter)], { type: 'text/csv;charset=utf-8' }), 'invoice-assignments.csv');
    } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); }
  };
  const totals = invoice.lines.reduce((s, l) => ({ net: s.net + l.net, vat: s.vat + l.vat }), { net: 0, vat: 0 });
  return <SiteShell><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
    <Link to="/tools/finance/vat-calculator" className="text-sm text-muted-foreground hover:text-foreground">← Gross / Net / VAT Calculator</Link>
    <div className="mt-6 flex flex-wrap items-start justify-between gap-5"><div><h1 className="font-display text-3xl font-bold sm:text-4xl"><span className="text-gradient">Invoice Review</span> & Assignments</h1><p className="mt-2 text-sm text-muted-foreground">{invoice.number || 'New invoice'} · {invoice.vendor || 'Supplier not set'} · {saved ? 'Saved on this browser' : 'Unsaved changes'}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { try { localStorage.setItem(storageKey, JSON.stringify(w)); setSaved(true); toast.success('Workspace saved on this browser'); } catch { setError('Cannot save in this browser. Export before leaving.'); } }}><Save />Save locally</Button><Button variant="ghost" onClick={() => { if (window.confirm('Clear this invoice? Reference lists and export settings will remain.')) { change(s => ({ ...s, invoice: blankInvoice() })); setPending(null); setError(''); } }}><Plus />New invoice</Button></div>
    </div>
    <nav aria-label="Invoice workspace" className="mt-8 flex flex-wrap gap-1 border-b pb-2">{[['review', 'Invoice & assignments'], ['lists', 'Accounts & centers'], ['export', 'Export profile']].map(([key, label]) => <Button key={key} variant={tab === key ? 'secondary' : 'ghost'} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</Button>)}</nav>
    <input ref={fileRef} type="file" accept=".xml,.csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
    {error && <p role="alert" className="mt-4 whitespace-pre-line text-sm text-destructive">{error}</p>}
    {pending && <SpreadsheetImport sheets={pending.sheets} target={pending.target} onImport={applyImport} onClose={() => setPending(null)} />}
    {tab === 'review' && <>
      <div className="mt-6 flex flex-wrap items-center gap-3"><Button disabled={busy} onClick={() => choose('invoice')}><Upload />{busy ? 'Reading…' : 'Import invoice'}</Button><Button variant="outline" onClick={() => change(s => ({ ...s, invoice: { ...s.invoice, lines: [...s.invoice.lines, blankLine()] } }))}><Plus />Add line</Button><Button asChild variant="link"><Link to="/tools/finance/vat-calculator">AI image / PDF reader</Link></Button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(['number', 'date', 'vendor', 'currency'] as const).map(k => <label key={k} className="text-sm text-muted-foreground">{{number: 'Invoice number', date: 'Invoice date', vendor: 'Supplier', currency: 'Currency'}[k]}<input className={`${inputClass} mt-1`} type={k === 'date' ? 'date' : 'text'} value={invoice[k]} onChange={e => change(s => ({ ...s, invoice: { ...s.invoice, [k]: k === 'currency' ? e.target.value.toUpperCase() : e.target.value } }))} /></label>)}</div>
      {!invoice.lines.length && <div className="my-10 flex flex-col items-center border-y py-10 text-muted-foreground"><FileSpreadsheet className="mb-3 h-10 w-10 text-primary" /><span>No invoice lines</span></div>}
      <div className="mt-8">{invoice.lines.map((l, i) => {
        const suggested = suggestion(l.description, w.accounts);
        return <section key={l.id} className="border-t py-6" aria-label={`Invoice line ${i + 1}`}>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-semibold">Line {i + 1}</h2><Button size="icon" variant="ghost" title="Delete line" aria-label={`Delete line ${i + 1}`} onClick={() => change(s => ({ ...s, invoice: { ...s.invoice, lines: s.invoice.lines.filter(x => x.id !== l.id) } }))}><Trash2 /></Button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[3fr_1fr_1fr_1fr]">
            <label className="text-xs text-muted-foreground">Description<input className={`${inputClass} mt-1`} value={l.description} onChange={e => updateLine(l.id, x => ({ ...x, description: e.target.value }))} /></label>
            {(['net', 'vatRate', 'vat'] as const).map(k => <label key={k} className="text-xs text-muted-foreground">{{net: 'Net amount', vatRate: 'VAT %', vat: 'VAT amount'}[k]}<input className={`${inputClass} mt-1`} type="number" step="any" value={Number.isFinite(l[k]) ? l[k] : ''} onChange={e => updateLine(l.id, x => { const n = e.target.value === '' ? NaN : Number(e.target.value); const next = { ...x, [k]: n }; if (k !== 'vat') next.vat = Math.round(next.net * next.vatRate) / 100; return next; })} /></label>)}
          </div>
          {l.allocations.map((a, j) => <div key={j} className="mt-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[6rem_2fr_1fr_1fr_auto]">
            <label className="text-xs text-muted-foreground">Split %<input aria-label={`Line ${i + 1} split ${j + 1} percent`} className={`${inputClass} mt-1`} type="number" step="any" value={Number.isFinite(a.percent) ? a.percent : ''} onChange={e => updateAllocation(l.id, j, { percent: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>
            <CodeSelect label={`Line ${i + 1} split ${j + 1} account`} value={a.account} options={w.accounts} onChange={account => updateAllocation(l.id, j, { account })} />
            <CodeSelect label={`Line ${i + 1} split ${j + 1} cost center`} value={a.cost} options={w.costs} onChange={cost => updateAllocation(l.id, j, { cost })} />
            <CodeSelect label={`Line ${i + 1} split ${j + 1} profit center`} value={a.profit} options={w.profits} onChange={profit => updateAllocation(l.id, j, { profit })} />
            <Button size="icon" variant="ghost" disabled={l.allocations.length === 1} title="Remove split" aria-label={`Remove line ${i + 1} split ${j + 1}`} onClick={() => updateLine(l.id, x => ({ ...x, allocations: x.allocations.filter((_, k) => k !== j) }))}><Trash2 /></Button>
          </div>)}
          <div className="mt-3 flex flex-wrap items-center gap-3"><Button size="sm" variant="outline" onClick={() => updateLine(l.id, x => ({ ...x, allocations: [...x.allocations, { ...blankAllocation(), percent: 0 }] }))}><Scissors />Add split</Button>{suggested && <Button variant="ghost" size="sm" onClick={() => updateLine(l.id, x => ({ ...x, allocations: x.allocations.map(a => ({ ...a, account: suggested })) }))}><WandSparkles />Approve suggestion: {suggested}</Button>}<span className="text-xs text-muted-foreground">Allocated {fmt(l.allocations.reduce((s, a) => s + a.percent, 0))}% · Gross {fmt(l.net + l.vat)} {invoice.currency}</span></div>
        </section>;
      })}</div>
      <div className="flex flex-wrap justify-end gap-6 border-y py-5 text-sm">{[['Net', totals.net], ['VAT', totals.vat], ['Gross', totals.net + totals.vat]].map(([label, value]) => <div key={String(label)}><span className="text-muted-foreground">{label} </span><strong>{fmt(Number(value))} {invoice.currency}</strong></div>)}</div>
    </>}
    {tab === 'lists' && <>
      <div className="flex flex-wrap items-center justify-between gap-3 py-6"><a href={accountSource} target="_blank" rel="noreferrer" className="text-sm text-primary underline">OMFP 1802 · 576 accounts · consolidated 13 Oct 2026</a><Button variant="outline" onClick={() => { if (window.confirm('Replace accounts with the OMFP preset?')) change(s => ({ ...s, accounts: omfpAccounts })); }}>Restore OMFP preset</Button></div>
      <ReferenceEditor title="Accounts" values={w.accounts} onChange={accounts => change(s => ({ ...s, accounts }))} onImport={() => choose('accounts')} />
      <ReferenceEditor title="Cost centers" values={w.costs} onChange={costs => change(s => ({ ...s, costs }))} onImport={() => choose('costs')} />
      <ReferenceEditor title="Profit centers" values={w.profits} onChange={profits => change(s => ({ ...s, profits }))} onImport={() => choose('profits')} />
      <Button variant="destructive" onClick={() => { if (window.confirm('Remove the saved workspace from this browser? The open invoice will remain until you leave.')) { try { localStorage.removeItem(storageKey); setSaved(false); toast.success('Saved copy removed'); } catch { setError('Cannot access browser storage.'); } } }}>Clear saved copy</Button>
    </>}
    {tab === 'export' && <section className="py-6">
      <h2 className="font-display text-xl">IFS Applications · Staging export</h2><p className="mt-2 text-sm text-muted-foreground">Confirm column names and code-part mappings with your IFS administrator before importing. This is not a posted journal or a universal IFS import format.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm">Profile name<input className={inputClass} value={w.profile.name} onChange={e => change(s => ({ ...s, profile: { ...s.profile, name: e.target.value } }))} /></label><label className="text-sm">CSV delimiter<select className={inputClass} value={w.profile.delimiter} onChange={e => change(s => ({ ...s, profile: { ...s.profile, delimiter: e.target.value === ';' ? ';' : ',' } }))}><option value=";">Semicolon (;)</option><option value=",">Comma (,)</option></select></label><Button variant="outline" onClick={() => change(s => ({ ...s, profile: ifsProfile }))}>Reset IFS preset</Button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{exportKeys.map(k => <label className="text-sm text-muted-foreground" key={k}>{k === 'cost' ? 'Cost center → code part' : k === 'profit' ? 'Profit center → code part' : k}<input className={inputClass} aria-label={`Export header ${k}`} value={w.profile.headers[k]} onChange={e => change(s => ({ ...s, profile: { ...s.profile, headers: { ...s.profile.headers, [k]: e.target.value } } }))} /></label>)}</div>
      {!issues.length && <div className="mt-6 overflow-auto rounded-md border"><table className="text-left text-xs"><thead><tr>{exportRows(w)[0].map((h, i) => <th key={i} className="whitespace-nowrap bg-muted p-3">{h}</th>)}</tr></thead><tbody>{exportRows(w).slice(1, 6).map((r, i) => <tr key={i} className="border-t">{r.map((v, j) => <td key={j} className="whitespace-nowrap p-3">{v}</td>)}</tr>)}</tbody></table></div>}
    </section>}
    <footer className="mt-6 border-t pt-5">
      {issues.length > 0 && <details className="mb-4 text-sm text-muted-foreground"><summary className="cursor-pointer">{issues.length} checks remaining before export</summary><ul className="mt-2 list-disc pl-5">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{invoice.lines.length} lines · {invoice.lines.reduce((s, l) => s + l.allocations.length, 0)} allocations</span><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={issues.length > 0} onClick={() => void doExport(false)}><Download />Export CSV</Button><Button disabled={issues.length > 0} onClick={() => void doExport(true)}><Download />Export Excel</Button></div></div>
    </footer>
  </main></SiteShell>;
}