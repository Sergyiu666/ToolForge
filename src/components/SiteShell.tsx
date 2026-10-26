import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { categories } from "@/lib/tools";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <nav aria-label="Tools navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/" className="font-display text-xl font-bold">
            Tool<span className="text-gradient">forge</span>
          </Link>
          <div className="flex flex-wrap gap-1 text-sm text-muted-foreground">
            {categories.map((c) => (
              <DropdownMenu key={c.slug}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-2 sm:px-3">{c.name}<ChevronDown aria-hidden="true" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
                  <DropdownMenuItem asChild>
                    <Link to="/tools/$category" params={{ category: c.slug }}>All {c.name} tools</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {c.tools.map((tool) => tool.href ? (
                    <DropdownMenuItem key={tool.name} asChild>
                      <Link to={tool.href} activeProps={{ className: "bg-accent text-accent-foreground" }} className="min-h-10 whitespace-normal">{tool.name}</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem key={tool.name} disabled className="min-h-10 justify-between whitespace-normal">
                      <span>{tool.name}</span><span className="shrink-0 text-xs">Soon</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
