import { useI18n } from "@/components/LanguageProvider";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Stat, ToolPage, fmt, meta, num } from "@/components/ToolPage";
import { marginMarkup, priceFromMargin, priceFromMarkup } from "@/lib/calc";

export const Route = createFileRoute("/tools/sales/margin-markup")({
  head: () => meta("Margin & Markup Calculator — Toolforge", "Convert between cost, price, margin and markup in one place."),
  component: Page,
});

type Mode = "price" | "margin" | "markup";

function Page() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("price");
  const [cost, setCost] = useState("");
  const [val, setVal] = useState("");
  const c = num(cost), v = num(val);
  const price = mode === "price" ? v : mode === "margin" ? (v < 100 ? priceFromMargin(c, v) : NaN) : priceFromMarkup(c, v);
  const ok = c > 0 && Number.isFinite(price);
  const r = ok ? marginMarkup(c, price) : null;
  const labels: Record<Mode, string> = { price: t("Selling price"), margin: t("Margin (%)"), markup: t("Markup (%)") };
  return (
    <ToolPage category="sales" categoryName={t("Sales")} title={t("Margin & Markup")} intro={t("Enter your cost and one of: price, margin or markup.")}>
      <div className="flex gap-2">
        {(Object.keys(labels) as Mode[]).map((k) => (
          <button key={k} onClick={() => { setMode(k); setVal(""); }} className={`flex-1 rounded-xl border px-3 py-3 text-sm font-medium ${mode === k ? "btn-glow border-transparent" : "text-muted-foreground hover:text-foreground"}`}>{t("I know the")} {labels[k].replace(" (%)", "").toLowerCase()}</button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={t("Cost")} value={cost} onChange={setCost} />
        <Field label={labels[mode]} value={val} onChange={setVal} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label={t("Price")} value={r ? fmt(price) : "—"} />
        <Stat label={t("Profit")} value={r ? fmt(r.profit) : "—"} />
        <Stat label={t("Margin")} value={r ? `${fmt(r.margin)}%` : "—"} />
        <Stat label={t("Markup")} value={r ? `${fmt(r.markup)}%` : "—"} />
      </div>
    </ToolPage>
  );
}
