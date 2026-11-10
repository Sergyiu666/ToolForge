import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ToolPage, Field, Stat, fmt, num, meta } from '@/components/ToolPage';
import { paymentLedger } from '@/lib/payment';
import { safeSpreadsheetValue } from '@/lib/company';
import { Copy, Download, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/tools/finance/payment-due-date')({
  head: () => meta('Payment Due Date & Late Penalties — Toolforge', 'Invoice due dates and contractual late penalties with partial payments, allocation rules and an optional penalty cap.'),
  component: PaymentCalculator,
});

type Pay = { id: number; date: string; amount: string };

function PaymentCalculator() {
  const [invoice, setInvoice] = useState('');
  const [asOf, setAsOf] = useState('');
  const [terms, setTerms] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [mode, setMode] = useState<'principal' | 'penalty'>('principal');
  const [capOn, setCapOn] = useState(false);
  const [cap, setCap] = useState('100');
  const [pays, setPays] = useState<Pay[]>([]);
  useEffect(() => { const today = new Date().toISOString().slice(0, 10); setInvoice(today); setAsOf(today); }, []);
  const complete = Boolean(invoice && asOf && terms && amount && rate) && pays.every((p) => p.date && p.amount);
  const r = paymentLedger({ invoiceDate: invoice, terms: num(terms), asOf, amount: num(amount), dailyRate: num(rate), mode, capPct: capOn ? num(cap) : null, payments: pays.map((p) => ({ date: p.date, amount: num(p.amount) })) });
  const update = (id: number, k: 'date' | 'amount', v: string) => setPays((ps) => ps.map((p) => (p.id === id ? { ...p, [k]: v } : p)));
  const header = ['From', 'To', 'Days', 'Principal', 'Penalty accrued', 'Payment', 'Principal left', 'Unpaid penalty'];
  const rows = () => r!.rows.map((x) => [x.from, x.to, String(x.days), fmt(x.principal), fmt(x.accrued), fmt(x.paid), fmt(x.principalLeft), fmt(x.penaltyLeft)]);
  const summary = () => `Invoice date: ${invoice}\nPayment terms: ${terms} days\nDue date: ${r!.dueDate}\nCalculated as of: ${asOf}\nInvoice amount: ${fmt(num(amount))}\nContractual penalty: ${rate}% per day\nPayments applied: ${mode === 'principal' ? 'principal first' : 'penalties first'}${capOn ? `\nPenalty cap: ${cap}% of invoice` : ''}\nPayments received: ${fmt(r!.paidTotal)}\nPenalties accrued: ${fmt(r!.accruedTotal)}\nOutstanding principal: ${fmt(r!.principal)}\nUnpaid penalties: ${fmt(r!.penalty)}\nBalance due: ${fmt(r!.balance)}`;
  const exportCsv = () => {
    const csv = [header, ...rows()].map((row) => row.map((v) => `"${String(safeSpreadsheetValue(v)).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'late-penalty-schedule.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const sel = 'rounded-xl border bg-background px-3 py-2 text-sm';
  return <ToolPage category="finance" categoryName="Finance & Accounting" title="Payment Due Date & Late Penalties" intro="Calendar-day terms · Contractual daily rate · Partial payments">
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Invoice date" type="date" value={invoice} onChange={setInvoice} />
      <Field label="Payment terms (calendar days)" value={terms} onChange={setTerms} placeholder="e.g. 30" />
      <Field label="Calculate as of" type="date" value={asOf} onChange={setAsOf} />
      <Field label="Invoice amount" value={amount} onChange={setAmount} placeholder="e.g. 1000" />
      <Field label="Contractual penalty (% per day)" value={rate} onChange={setRate} placeholder="Enter your agreed rate" />
      <label className="grid gap-2 text-sm">Apply partial payments to
        <select className={sel} value={mode} onChange={(e) => setMode(e.target.value as 'principal' | 'penalty')}>
          <option value="principal">Principal first</option>
          <option value="penalty">Penalties first (Civil Code art. 1509)</option>
        </select>
      </label>
      <div className="grid gap-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={capOn} onChange={(e) => setCapOn(e.target.checked)} />Cap total penalties</label>
        {capOn && <Field label="Cap (% of invoice amount)" value={cap} onChange={setCap} />}
      </div>
    </div>

    <div className="mt-8">
      <div className="flex items-center justify-between"><h2 className="font-display text-lg">Partial payments</h2>
        <button type="button" onClick={() => setPays((ps) => [...ps, { id: Date.now(), date: asOf, amount: '' }])} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:border-primary"><Plus className="h-4 w-4" />Add payment</button></div>
      {pays.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No payments yet. Payments after the "as of" date are ignored.</p>}
      <div className="mt-3 grid gap-3">{pays.map((p) => <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
        <Field label="Payment date" type="date" value={p.date} onChange={(v) => update(p.id, 'date', v)} />
        <Field label="Amount" value={p.amount} onChange={(v) => update(p.id, 'amount', v)} placeholder="e.g. 500" />
        <button type="button" aria-label="Remove payment" onClick={() => setPays((ps) => ps.filter((x) => x.id !== p.id))} className="rounded-xl border p-2 hover:border-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>)}</div>
    </div>

    {complete && !r && <p role="alert" className="mt-5 text-sm text-destructive">Use valid dates, a whole number of days (0–36,500), positive amounts, a daily rate from 0 to 100% and a non-negative cap. The calculation date cannot precede the invoice date.</p>}
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <Stat label="Due date" value={r?.dueDate ?? '—'} />
      <Stat label="Payments received" value={r ? fmt(r.paidTotal) : '—'} />
      <Stat label="Penalties accrued" value={r ? fmt(r.accruedTotal) + (r.capped ? ' (cap reached)' : '') : '—'} />
      <Stat label="Outstanding principal" value={r ? fmt(r.principal) : '—'} />
      <Stat label="Unpaid penalties" value={r ? fmt(r.penalty) : '—'} />
      <Stat label="Balance due" value={r ? fmt(r.balance) : '—'} />
    </div>

    {r && complete && r.rows.length > 0 && <div className="mt-8 overflow-x-auto rounded-xl border">
      <table className="w-full text-sm"><thead className="bg-muted/40 text-left"><tr>{header.map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows().map((row, i) => <tr key={i} className="border-t">{row.map((v, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{v}</td>)}</tr>)}</tbody></table>
    </div>}

    {r && complete && <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(summary()); toast.success('Summary copied'); } catch { toast.error('Could not copy the summary'); } }} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:border-primary"><Copy className="h-4 w-4" />Copy summary</button>
      <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:border-primary"><Download className="h-4 w-4" />Export CSV</button>
    </div>}
    <p className="mt-5 text-xs text-muted-foreground">Contractual estimate only, not a statutory Romanian penalty rate. Calendar days include weekends and holidays; penalties start the day after the due date and accrue on the principal still unpaid. All amounts use the currency of your invoice.</p>
  </ToolPage>;
}
