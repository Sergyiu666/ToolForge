import { useI18n } from "@/components/LanguageProvider";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Stat, ToolPage, fmt, meta, num } from "@/components/ToolPage";
import { tieredCommission } from "@/lib/calc";

export const Route = createFileRoute("/tools/sales/commission-calculator")({
  head: () => meta("Commission Calculator — Toolforge", "Tiered sales commission payouts, with each rate applied only to its band of sales."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const [sales, setSales] = useState("");
  const [tiers, setTiers] = useState([{ upTo: "", rate: "" }]);
  const s = num(sales);
  const parsed = tiers.map((t, i) => ({ upTo: i === tiers.length - 1 ? null : num(t.upTo), ratePct: num(t.rate) }));
  const valid = s > 0 && parsed.every((t, i) => t.ratePct >= 0 && (t.upTo === null || (t.upTo > 0 && (i === 0 || t.upTo > (parsed[i - 1]!.upTo ?? 0)))));
  const r = valid ? tieredCommission(s, parsed) : null;
  const set = (i: number, k: "upTo" | "rate", v: string) => setTiers((x) => x.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  return (
    <ToolPage category="sales" categoryName={t("Sales")} title={t("Commission Calculator")} intro={t("Each rate applies only to the part of sales inside its band. The last band has no upper limit.")}>
      <Field label={t("Total sales")} value={sales} onChange={setSales} />
      <div className="mt-4 space-y-3">
        {tiers.map((t, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-2">
            {i === tiers.length - 1 ? <div className="self-end pb-3 text-sm text-muted-foreground">{t("Band")} {i + 1}: above the previous limit</div> : <Field label={t("Band {0}: sales up to", i + 1)} value={t.upTo} onChange={(v) => set(i, "upTo", v)} />}
            <Field label={t("Rate (%)")} value={t.rate} onChange={(v) => set(i, "rate", v)} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        <button onClick={() => setTiers((x) => [...x.slice(0, -1), { upTo: "", rate: "" }, x.at(-1)!])} className="text-primary hover:underline">{t("+ Add band")}</button>
        {tiers.length > 1 && <button onClick={() => setTiers((x) => [...x.slice(0, -2), x.at(-1)!])} className="text-muted-foreground hover:underline">{t("Remove band")}</button>}
      </div>
      <div className="mt-6"><Stat label={t("Commission")} value={r ? fmt(r.total) : "—"} /></div>
      {r && r.parts.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {r.parts.map((p, i) => <li key={i}>{fmt(p.from)} – {fmt(p.to)} at {p.ratePct}% = {fmt(p.amount)}</li>)}
        </ul>
      )}
    </ToolPage>
  );
}
