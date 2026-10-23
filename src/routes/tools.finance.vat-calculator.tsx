import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState, type ClipboardEvent } from "react";
import { SiteShell } from "@/components/SiteShell";
import { computeVat, type VatField } from "@/lib/vat";
import { analyzeInvoiceFn } from "@/lib/invoice.functions";
import type { InvoiceAnalysis } from "@/lib/invoice-ai.server";

const title = "Gross / Net / VAT Calculator — Toolforge";
const description = "Enter any VAT rate and get net, VAT and gross instantly — or drop an invoice screenshot to read the items automatically.";

export const Route = createFileRoute("/tools/finance/vat-calculator")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VatPage,
});

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function VatPage() {
  const [rate, setRate] = useState("21");
  const [field, setField] = useState<VatField>("net");
  const [amount, setAmount] = useState("");

  const result = useMemo(() => {
    const a = parseFloat(amount.replace(",", "."));
    const r = parseFloat(rate.replace(",", "."));
    if (isNaN(a) || isNaN(r) || r < 0) return null;
    return computeVat(field, a, r);
  }, [amount, rate, field]);

  const useItem = (net: number, vatRate: number) => {
    setField("net");
    setAmount(String(net));
    setRate(String(vatRate));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-6 py-16">
          <Link to="/tools/$category" params={{ category: "finance" }} className="text-sm text-muted-foreground hover:text-foreground">← Finance & Accounting</Link>
          <h1 className="font-display mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient">Gross / Net / VAT</span> Calculator
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Type your VAT rate and one amount — the other two fill in automatically.</p>

          <div className="card-glow mt-10 rounded-2xl p-6 hover:transform-none">
            <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
              <label className="block">
                <span className="text-sm text-muted-foreground">VAT rate (%)</span>
                <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="mt-2 w-full rounded-xl border bg-input/30 px-4 py-3 text-lg outline-none focus:border-primary" />
              </label>
              <div>
                <span className="text-sm text-muted-foreground">I know the…</span>
                <div className="mt-2 flex gap-2">
                  {(["net", "vat", "gross"] as VatField[]).map((f) => (
                    <button key={f} onClick={() => setField(f)} className={`flex-1 rounded-xl border px-3 py-3 text-sm font-medium capitalize ${field === f ? "btn-glow border-transparent" : "text-muted-foreground hover:text-foreground"}`}>
                      {f === "vat" ? "VAT" : f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="mt-5 block">
              <span className="text-sm text-muted-foreground">Amount</span>
              <input inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2 w-full rounded-xl border bg-input/30 px-4 py-3 text-2xl outline-none focus:border-primary" />
            </label>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[["Net", result?.net], ["VAT", result?.vat], ["Gross", result?.gross]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-secondary p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{l}</div>
                  <div className="font-display mt-1 text-2xl font-semibold">{v == null ? "—" : fmt(v as number)}</div>
                </div>
              ))}
            </div>
          </div>

          <InvoiceReader onUse={useItem} />
        </div>
      </section>
    </SiteShell>
  );
}

function InvoiceReader({ onUse }: { onUse: (net: number, rate: number) => void }) {
  const analyze = useServerFn(analyzeInvoiceFn);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvoiceAnalysis | null>(null);

  const handleFile = async (file: File) => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) return setError("Please use a PNG, JPG, WEBP or PDF file.");
    if (file.size > 10_000_000) return setError("File is too large (max 10 MB).");
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setPreview(file.type.startsWith("image/") ? dataUrl : null);
    setError(null);
    setData(null);
    setLoading(true);
    try {
      const out = await analyze({ data: { dataUrl, mimeType: file.type as "image/png" } });
      setData(out);
      if (!out.items.length) setError("No invoice items found in this file.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    const f = Array.from(e.clipboardData.files)[0];
    if (f) handleFile(f);
  };

  const totals = data?.items.reduce((t, i) => ({ net: t.net + i.net, vat: t.vat + i.vat, gross: t.gross + i.gross }), { net: 0, vat: 0, gross: 0 });

  return (
    <div className="mt-10">
      <h2 className="font-display text-2xl font-semibold">Read an invoice</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upload, drop or paste (Ctrl+V) a screenshot or PDF. AI picks out each item, its VAT and a category.</p>
      <div
        tabIndex={0}
        onPaste={onPaste}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center outline-none hover:border-primary focus:border-primary"
      >
        {preview ? <img src={preview} alt="Invoice preview" className="max-h-56 rounded-lg" /> : <div className="text-4xl text-muted-foreground">⇪</div>}
        <p className="mt-3 text-sm text-muted-foreground">{loading ? "Reading invoice…" : "Click to choose, drop a file, or click here and paste"}</p>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {data && data.items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border">
          <div className="flex justify-between px-4 py-3 text-sm text-muted-foreground">
            <span>{data.vendor ?? "Invoice"}</span><span>{data.currency ?? ""}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Item</th><th className="p-3">Category</th><th className="p-3 text-right">Net</th><th className="p-3 text-right">VAT %</th><th className="p-3 text-right">VAT</th><th className="p-3 text-right">Gross</th><th /></tr>
            </thead>
            <tbody>
              {data.items.map((i, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3">{i.description}</td>
                  <td className="p-3"><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{i.category}</span></td>
                  <td className="p-3 text-right">{fmt(i.net)}</td>
                  <td className="p-3 text-right">{i.vatRate}%</td>
                  <td className="p-3 text-right">{fmt(i.vat)}</td>
                  <td className="p-3 text-right">{fmt(i.gross)}</td>
                  <td className="p-3"><button onClick={() => onUse(i.net, i.vatRate)} className="text-primary hover:underline">Use</button></td>
                </tr>
              ))}
              {totals && (
                <tr className="border-t font-semibold">
                  <td className="p-3" colSpan={2}>Total</td>
                  <td className="p-3 text-right">{fmt(totals.net)}</td><td />
                  <td className="p-3 text-right">{fmt(totals.vat)}</td>
                  <td className="p-3 text-right">{fmt(totals.gross)}</td><td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
