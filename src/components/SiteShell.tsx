import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { categories } from "@/lib/tools";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from '@/components/LanguageProvider';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export function SiteShell({ children }: { children: ReactNode }) {
  const { t, language, setLanguage } = useI18n();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <nav aria-label={t('Tools navigation')} className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/" className="font-display text-xl font-bold">
            Tool<span className="text-gradient">forge</span>
          </Link>
          <div role="group" aria-label="Language / Limbă" className="flex shrink-0 gap-1 sm:order-last">
            <Button size="sm" variant={language === 'ro' ? 'secondary' : 'ghost'} aria-pressed={language === 'ro'} onClick={() => setLanguage('ro')}>RO</Button>
            <Button size="sm" variant={language === 'en' ? 'secondary' : 'ghost'} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</Button>
          </div>
          <div className="flex w-full flex-wrap gap-1 text-sm text-muted-foreground sm:w-auto">
            {categories.map((c) => (
              <DropdownMenu key={c.slug}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-2 sm:px-3">{t(c.name)}<ChevronDown aria-hidden="true" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
                  <DropdownMenuItem asChild>
                    <Link to="/tools/$category" params={{ category: c.slug }}>{t('All {0} tools', t(c.name))}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {c.tools.map((tool) => tool.href ? (
                    <DropdownMenuItem key={tool.name} asChild>
                      <Link to={tool.href} activeProps={{ className: "bg-accent text-accent-foreground" }} className="min-h-10 whitespace-normal">{t(tool.name)}</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem key={tool.name} disabled className="min-h-10 justify-between whitespace-normal">
                      <span>{t(tool.name)}</span><span className="shrink-0 text-xs">{t('Soon')}</span>
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
        {t('Toolforge — free tools for everyone.')}
      </footer>
    </div>
  );
}
