import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ToolPage, Field, Stat, fmt, num, meta } from '@/components/ToolPage';
import { paymentDue } from '@/lib/payment';

export const Route = createFileRoute('/tools/finance/payment-due-date')({
  head: () => meta('Payment Due Date & Late Penalties — Toolforge', 'Calculate calendar-day invoice due dates and simple late payment penalties using your contractual daily rate.'),
  component: PaymentCalculator,
});

function PaymentCalculator() {
  const [invoice, setInvoice] = useState('');
  const [asOf, setAsOf] = useState('');
  const [terms, setTerms] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  useEffect(() => { const today = new Date().toISOString().slice(0, 10); setInvoice(today); setAsOf(today); }, []);
  const result = paymentDue(invoice, num(terms), asOf, num(amount), num(rate));
  const complete = Boolean(invoice && asOf && terms && amount && rate);
  return <ToolPage category="finance" categoryName="Finance & Accounting" title="Payment Due Date & Late Penalties" intro="Calendar-day terms · Contractual daily rate · Simple interest">
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Invoice date" type="date" value={invoice} onChange={setInvoice} />
      <Field label="Payment terms (calendar days)" value={terms} onChange={setTerms} placeholder="e.g. 30" />
      <Field label="Calculate as of" type="date" value={asOf} onChange={setAsOf} />
      <Field label="Outstanding amount" value={amount} onChange={setAmount} placeholder="e.g. 1000" />
      <Field label="Contractual penalty (% per day)" value={rate} onChange={setRate} placeholder="Enter your agreed rate" />
    </div>
    {complete && !result && <p role="alert" className="mt-5 text-sm text-destructive">Use valid dates, a whole number of days (0–36,500), a non-negative amount and a daily rate from 0 to 100%. The calculation date cannot precede the invoice date.</p>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <Stat label="Due date" value={result?.dueDate ?? '—'} />
      <Stat label="Days overdue" value={result ? String(result.overdue) : '—'} />
      <Stat label="Late payment penalty" value={result ? fmt(result.penalty) : '—'} />
      <Stat label="Total outstanding" value={result ? fmt(result.total) : '—'} />
    </div>
    <p className="mt-5 text-xs text-muted-foreground">Contractual estimate only, not a statutory Romanian penalty rate. Calendar days include weekends and holidays; penalties start the day after the due date. All amounts use the currency of your invoice.</p>
  </ToolPage>;
}