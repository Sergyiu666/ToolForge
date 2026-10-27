import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Field, Stat, ToolPage, fmt, meta, num } from "@/components/ToolPage";
import { loanSchedule } from "@/lib/calc";

export const Route = createFileRoute("/tools/finance/loan-calculator")({
  head: () => meta("Loan Calculator — Toolforge", "Monthly loan payments, total interest and a full amortization schedule."),
  component: Page,
});

function Page() {
  const [p, setP] = useState("100000");
  const [r, setR] = useState("");
  const [m, setM] = useState("60");
  const res = useMemo(() => {
    const P = num(p), R = num(r), M = Math.round(num(m));
    if (!(P > 0) || !(R >= 0) || !(M > 0) || M > 600) return null;
    return loanSchedule(P, R, M);
  }, [p, r, m]);
  return (
    <ToolPage category="finance" categoryName="Finance & Accounting" title="Loan Calculator" intro="Enter the amount, yearly interest and number of months.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Loan amount" value={p} onChange={setP} />
        <Field label="Yearly interest (%)" value={r} onChange={setR} placeholder="e.g. 7.5" />
        <Field label="Months" value={m} onChange={setM} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Monthly payment" value={res ? fmt(res.payment) : "—"} />
        <Stat label="Total interest" value={res ? fmt(res.totalPaid - num(p)) : "—"} />
        <Stat label="Total paid" value={res ? fmt(res.totalPaid) : "—"} />
      </div>
      {res && (
        <div className="mt-6 max-h-96 overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-2">Month</th><th className="p-2 text-right">Payment</th><th className="p-2 text-right">Interest</th><th className="p-2 text-right">Principal</th><th className="p-2 text-right">Balance</th></tr>
            </thead>
            <tbody>
              {res.rows.map((x) => (
                <tr key={x.month} className="border-t"><td className="p-2">{x.month}</td><td className="p-2 text-right">{fmt(x.payment)}</td><td className="p-2 text-right">{fmt(x.interest)}</td><td className="p-2 text-right">{fmt(x.principal)}</td><td className="p-2 text-right">{fmt(x.balance)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ToolPage>
  );
}
