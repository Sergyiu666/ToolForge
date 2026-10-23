import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { getCategory } from "@/lib/tools";

export const Route = createFileRoute("/tools/$category")({
  loader: ({ params }) => {
    const category = getCategory(params.category);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.category;
    const title = c ? `${c.name} Tools — Toolforge` : "Unavailable — Toolforge";
    const description = c?.tagline ?? "Tool category not found.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← All categories</Link>
          <h1 className="font-display mt-6 text-5xl font-bold tracking-tight">
            <span className="text-gradient">{category.name}</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{category.tagline}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-28 sm:grid-cols-2 lg:grid-cols-3">
        {category.tools.map((t) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{t.name}</h2>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                  {t.live ? "Live" : "Soon"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
            </>
          );
          return t.href ? (
            <a key={t.name} href={t.href} className="card-glow block rounded-2xl p-6">{inner}</a>
          ) : (
            <div key={t.name} className="card-glow rounded-2xl p-6">{inner}</div>
          );
        })}
      </section>
    </SiteShell>
  );
}
