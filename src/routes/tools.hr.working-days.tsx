import { useI18n } from "@/components/LanguageProvider";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Stat, ToolPage, meta } from "@/components/ToolPage";
import { workingDays } from "@/lib/calc";
import { HOLIDAY_SOURCE, HOLIDAY_VERIFIED, HOLIDAY_YEARS, romanianHolidays } from "@/lib/holidays";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/tools/hr/working-days")({
  head: () => meta("Working Days Counter — Toolforge", "Count business days with Romanian public holiday presets for 2024–2027 and your custom holidays."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hol, setHol] = useState("");
  const [useRomanian, setUseRomanian] = useState(true);
  const [calendar, setCalendar] = useState<'orthodox' | 'western'>('orthodox');
  const years = HOLIDAY_YEARS.filter(year => start && end && year >= Number(start.slice(0, 4)) && year <= Number(end.slice(0, 4)));
  const preset = useRomanian ? years.flatMap(year => romanianHolidays(year, calendar)) : [];
  const holidays = [...preset.map(h => h.date), ...hol.split(/[\s,;]+/).filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h))];
  const outsideCoverage = useRomanian && start && end && (Number(start.slice(0, 4)) < 2024 || Number(end.slice(0, 4)) > 2027);
  const r = start && end ? workingDays(start, end, holidays) : null;
  return (
    <ToolPage category="hr" categoryName={t("HR")} title={t("Working Days Counter")} intro={t("Monday–Friday days between two dates, both included.")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("From")} type="date" value={start} onChange={setStart} />
        <Field label={t("To")} type="date" value={end} onChange={setEnd} />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y py-4">
        <label htmlFor="romanian-holidays" className="flex items-center gap-3 text-sm"><Switch id="romanian-holidays" checked={useRomanian} onCheckedChange={setUseRomanian} />{t("Romanian public holidays (2024–2027)")}</label>
        {useRomanian && <label className="text-sm">{t("Religious calendar")} <select aria-label={t("Religious calendar")} value={calendar} onChange={e => setCalendar(e.target.value === 'western' ? 'western' : 'orthodox')} className="ml-2 rounded-md border bg-background p-2"><option value="orthodox">{t("Orthodox")}</option><option value="western">{t("Western Christian")}</option></select></label>}
      </div>
      {outsideCoverage && <p role="alert" className="mt-3 text-sm text-destructive">{t("Romanian presets cover 2024–2027 only. Add holidays for other years manually.")}</p>}
      <label className="mt-4 block">
        <span className="text-sm text-muted-foreground">{t("Additional holidays (YYYY-MM-DD, separated by commas or new lines)")}</span>
        <textarea value={hol} onChange={(e) => setHol(e.target.value)} rows={3} placeholder="2026-12-25, 2026-12-26" className="mt-2 w-full rounded-xl border bg-input/30 px-4 py-3 outline-none focus:border-primary" />
      </label>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label={t("Working days")} value={r ? String(r.working) : "—"} />
        <Stat label={t("Weekend days")} value={r ? String(r.weekend) : "—"} />
        <Stat label={t("Holidays on weekdays")} value={r ? String(r.holidays) : "—"} />
      </div>
      {start && end && !r && <p className="mt-3 text-sm text-destructive">{t("The end date must be after the start date.")}</p>}
      {preset.length > 0 && <details className="mt-5 border-t pt-4 text-sm"><summary className="cursor-pointer text-muted-foreground">{t("Romanian holiday calendar")}</summary><ul className="mt-3 grid gap-2 sm:grid-cols-2">{preset.map((h, i) => <li key={`${h.date}-${i}`}><span className="font-mono text-muted-foreground">{h.date}</span> · {h.name}</li>)}</ul></details>}
      <p className="mt-4 text-xs text-muted-foreground"><a href={HOLIDAY_SOURCE} target="_blank" rel="noreferrer" className="text-primary">{t("Labour Code, Article 139")}</a> · Verified {HOLIDAY_VERIFIED}. Government bridge days and other religious observances are not included.</p>
    </ToolPage>
  );
}
