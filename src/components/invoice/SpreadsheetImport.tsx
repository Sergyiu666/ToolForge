import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export type SheetData = { name: string; rows: Record<string, unknown>[] };
export type ImportTarget = 'invoice' | 'accounts' | 'costs' | 'profits';
const invoiceFields = ['number', 'date', 'vendor', 'currency', 'description', 'net', 'vatRate', 'vat'];
export const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary';
export function SpreadsheetImport({ sheets, target, onImport, onClose }: { sheets: SheetData[]; target: ImportTarget; onImport: (rows: Record<string, unknown>[], mapping: Record<string, string>) => void; onClose: () => void }) {
  const [sheet, setSheet] = useState(0);
  const fields = target === 'invoice' ? invoiceFields : ['code', 'name'];
  const rows = sheets[sheet]?.rows ?? [];
  const headers = Object.keys(rows[0] ?? {});
  const guess = () => Object.fromEntries(fields.map(f => [f, headers.find(h => h.toLowerCase().replace(/[ _%]/g, '') === f.toLowerCase()) ?? '']));
  const [mapping, setMapping] = useState<Record<string, string>>(guess);
  return <section className="mt-6 border-y py-5" aria-label="Map spreadsheet columns">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl">Map columns · {target}</h2><Button variant="ghost" size="icon" title="Cancel import" onClick={onClose}><X /></Button></div>
    <label className="mt-4 block text-sm">Worksheet<select className={inputClass} value={sheet} onChange={e => { setSheet(Number(e.target.value)); setMapping({}); }}>{sheets.map((s, i) => <option key={i} value={i}>{s.name}</option>)}</select></label>
    <div className="mt-4 grid gap-3 sm:grid-cols-4">{fields.map(f => <label key={f} className="text-sm">{f === 'vat' ? 'VAT amount (optional)' : f}<select aria-label={`Column for ${f}`} className={inputClass} value={mapping[f] ?? ''} onChange={e => setMapping(m => ({ ...m, [f]: e.target.value }))}><option value="">Not mapped</option>{headers.map(h => <option key={h}>{h}</option>)}</select></label>)}</div>
    <div className="mt-4 overflow-auto"><table className="text-left text-xs"><thead><tr>{headers.map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0, 3).map((r, i) => <tr className="border-t" key={i}>{headers.map(h => <td key={h} className="max-w-48 truncate p-2">{String(r[h] ?? '')}</td>)}</tr>)}</tbody></table></div>
    <Button className="mt-4" disabled={!rows.length || fields.filter(f => f !== 'vat').some(f => !mapping[f])} onClick={() => onImport(rows, mapping)}>Import {rows.length} rows</Button>
  </section>;
}