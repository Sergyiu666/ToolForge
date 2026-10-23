import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { categories } from "@/lib/tools";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl font-bold tracking-tight">
            Tool<span className="text-gradient">forge</span>
          </Link>
          <div className="hidden gap-6 text-sm text-muted-foreground md:flex">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/tools/$category"
                params={{ category: c.slug }}
                className="transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Toolforge — free tools for everyone.
      </footer>
    </div>
  );
}
