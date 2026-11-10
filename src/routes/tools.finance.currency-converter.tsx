import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Field, Stat, ToolPage, meta, num } from '@/components/ToolPage';
import { bnrRatesFn } from '@/lib/bnr.functions';
import { convert, type BnrDay } from '@/lib/bnr';

export const Route = createFileRoute('/tools/finance/currency-converter')({
  head: () => meta('BNR Currency Converter — Toolforge', 'Convert between RON and other currencies using official National Bank of Romania reference rates for any date.'),
  component: Page,
});

const f4 = (n: number) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';

function Page() {
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('RON');
  const [day, setDay] = useState<BnrDay | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { setDate(new Date().toISOString().slice(0, 10)); }, []);
  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    let live = true; setLoading(true); setError('');
    bnrRatesFn({ data: { date } }).then(d => live && setDay(d)).catch(() => live && (setDay(null), setError('Could not load BNR rates for this date. Try another date.'))).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [date]);
  const codes = day ? Object.keys(day.rates).sort() : [from, to];
  const result = day ? convert(num(amount), from, to, day.rates) : NaN;
  const sel = (v: string, set: (v: string) => void, label: string) => <label className="block"><span className="text-sm text-muted-foreground">{label}</span>
    <select aria-label={label} value={v} onChange={e => set(e.target.value)} className="mt-2 w-full rounded-xl border bg-background px-4 py-3 text-lg">{codes.map(c => <option key={c}>{c}</option>)}</select></label>;
  return <ToolPage category="finance" categoryName="Finance & Accounting" title="BNR Currency Converter" intro="Official National Bank of Romania reference rates · any date since 2005">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Amount" value={amount} onChange={setAmount} />
      <Field label="Rate date" type="date" value={date} onChange={setDate} />
    </div>
    <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
      {sel(from, setFrom, 'From')}
      <button type="button" aria-label="Swap currencies" onClick={() => { setFrom(to); setTo(from); }} className="mb-1 rounded-xl border p-3 hover:border-primary"><ArrowLeftRight className="h-5 w-5" /></button>
      {sel(to, setTo, 'To')}
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Stat label={`Result (${to})`} value={loading ? '…' : f4(result)} />
      <Stat label={`1 ${from} =`} value={loading || !day ? '—' : `${f4(convert(1, from, to, day.rates))} ${to}`} />
    </div>
    {day && <p className="mt-4 text-xs text-muted-foreground">BNR rate published {day.date}{day.date !== date ? ' (latest before the selected date; BNR does not publish on weekends or holidays)' : ''}. Cross rates are computed through RON. Source: <a href="https://curs.bnr.ro/nbrfxrates.xml" target="_blank" rel="noreferrer" className="text-primary">curs.bnr.ro</a>.</p>}
  </ToolPage>;
}
