import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/SiteShell";

export const fmt = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
export const num = (v: string) => parseFloat(v.replace(",", "."));

export function ToolPage({ category, categoryName, title, intro, children }: { category: "finance" | "hr" | "sales"; categoryName: string; title: string; intro: string; children: ReactNode }) {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-6 py-16">
          <Link to="/tools/$category" params={{ category }} className="text-sm text-muted-foreground hover:text-foreground">← {categoryName}</Link>
          <h1 className="font-display mt-6 text-4xl font-bold tracking-tight sm:text-5xl"><span className="text-gradient">{title}</span></h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{intro}</p>
          <div className="card-glow mt-10 rounded-2xl p-6 hover:transform-none">{children}</div>
        </div>
      </section>
    </SiteShell>
  );
}

export function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input type={type} inputMode={type === "text" ? "decimal" : undefined} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border bg-input/30 px-4 py-3 text-lg outline-none focus:border-primary" />
    </label>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export const meta = (title: string, description: string) => ({
  meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ],
});
