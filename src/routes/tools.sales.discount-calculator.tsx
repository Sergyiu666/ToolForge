import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Stat, ToolPage, fmt, meta, num } from "@/components/ToolPage";
import { stackedDiscount } from "@/lib/calc";

export const Route = createFileRoute("/tools/sales/discount-calculator")({
  head: () => meta("Discount Calculator — Toolforge", "Apply one or several stacked discounts and see the final price and real total discount."),
  component: Page,
});

function Page() {
  const [price, setPrice] = useState("");
  const [discounts, setDiscounts] = useState<string[]>(["", ""]);
  const p = num(price);
  const ds = discounts.map(num).filter((d) => d >= 0 && d <= 100);
  const r = p > 0 ? stackedDiscount(p, ds) : null;
  return (
    <ToolPage category="sales" categoryName="Sales" title="Discount Calculator" intro="Discounts are applied one after another, in order.">
      <Field label="Original price" value={price} onChange={setPrice} />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {discounts.map((d, i) => (
          <Field key={i} label={`Discount ${i + 1} (%)`} value={d} onChange={(v) => setDiscounts((x) => x.map((y, j) => (j === i ? v : y)))} />
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        <button onClick={() => setDiscounts((x) => [...x, ""])} className="text-primary hover:underline">+ Add discount</button>
        {discounts.length > 1 && <button onClick={() => setDiscounts((x) => x.slice(0, -1))} className="text-muted-foreground hover:underline">Remove last</button>}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Final price" value={r ? fmt(r.final) : "—"} />
        <Stat label="You save" value={r ? fmt(r.saved) : "—"} />
        <Stat label="Total discount" value={r ? `${fmt(r.effectivePct)}%` : "—"} />
      </div>
    </ToolPage>
  );
}
