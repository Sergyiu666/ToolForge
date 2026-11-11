import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Upload } from 'lucide-react';
import type { Code } from '@/lib/invoice-review';
import { inputClass } from './SpreadsheetImport';

export function ReferenceEditor({ title, values, onChange, onImport }: { title: string; values: Code[]; onChange: (values: Code[]) => void; onImport: () => void }) {
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const filtered = values.filter(v => `${v.code} ${v.name}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="border-t py-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl">{title} <span className="text-sm text-muted-foreground">({values.length})</span></h2><Button variant="outline" onClick={onImport}><Upload />Import list</Button></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
      <input className={inputClass} placeholder="Code" aria-label={`${title} new code`} value={code} onChange={e => setCode(e.target.value)} />
      <input className={inputClass} placeholder="Name" aria-label={`${title} new name`} value={name} onChange={e => setName(e.target.value)} />
      <Button variant="secondary" disabled={!code.trim() || !name.trim() || values.some(v => v.code === code.trim())} onClick={() => { onChange([...values, { code: code.trim(), name: name.trim() }]); setCode(''); setName(''); }}><Plus />Add</Button>
    </div>
    <input className={`${inputClass} mt-4`} aria-label={`Search ${title}`} placeholder="Search code or name" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="mt-3 max-h-64 overflow-auto">{filtered.map(v => <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 border-b py-2 text-sm" key={v.code}><span className="font-mono">{v.code}</span><input aria-label={`${title} ${v.code} name`} className={inputClass} value={v.name} onChange={e => onChange(values.map(c => c.code === v.code ? { ...c, name: e.target.value } : c))} /><Button size="icon" variant="ghost" title={`Remove ${v.code}`} aria-label={`Remove ${title} ${v.code}`} onClick={() => onChange(values.filter(c => c.code !== v.code))}><Trash2 /></Button></div>)}</div>
  </section>;
}