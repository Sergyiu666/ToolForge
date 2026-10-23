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
  const total = categories.reduce((n, c) => n + c.tools.length, 0);
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6 py-28 md:py-36">
          <p className="mb-6 inline-block rounded-full border border-border px-4 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {total}+ tools · free forever
          </p>
          <h1 className="font-display max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Every tool your work needs, <span className="text-gradient">in one place.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            From quick calculators to live data lookups — built for finance, HR, sales and everyone in between.
          </p>
          <a href="#categories" className="btn-glow mt-10 inline-flex rounded-full px-7 py-3 font-medium">
            Browse tools
          </a>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-6xl px-6 pb-28">
        <div className="grid gap-5 md:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/tools/$category"
              params={{ category: c.slug }}
              className="card-glow group rounded-2xl p-8"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-xl text-primary-foreground">
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
