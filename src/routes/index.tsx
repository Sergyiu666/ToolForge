import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { categories } from "@/lib/tools";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toolforge — Free Finance, HR & Sales Tools" },
      { name: "description", content: "A growing collection of free online tools for finance, HR, sales and everyday work." },
      { property: "og:title", content: "Toolforge — Free Finance, HR & Sales Tools" },
      { property: "og:description", content: "A growing collection of free online tools for finance, HR, sales and everyday work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <h1 className="font-display text-5xl font-bold">Tool<span className="text-gradient">forge</span></h1>
        <p className="mt-4 text-lg text-muted-foreground">Finance & Accounting · HR · Sales</p>
      </section>

      <section aria-label="Tool categories" className="mx-auto max-w-6xl px-6 pb-28">
        <div className="grid gap-5 md:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/tools/$category"
              params={{ category: c.slug }}
              className="card-glow group rounded-lg p-6"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-brand text-xl text-primary-foreground">
                {c.icon}
              </div>
              <h2 className="font-display text-2xl font-semibold">{c.name}</h2>
              <p className="mt-2 text-muted-foreground">{c.tagline}</p>
              <p className="mt-6 text-sm text-primary transition-transform group-hover:translate-x-1">
                {c.tools.length} tools →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
