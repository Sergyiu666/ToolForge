import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Stat, ToolPage, meta } from "@/components/ToolPage";
import { workingDays } from "@/lib/calc";

export const Route = createFileRoute("/tools/hr/working-days")({
  head: () => meta("Working Days Counter — Toolforge", "Count business days between two dates, excluding weekends and the holidays you list."),
  component: Page,
});

function Page() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hol, setHol] = useState("");
  const holidays = hol.split(/[\s,;]+/).filter((h) => /^\d{4}-\d{2}-\d{2}$/.test(h));
  const r = start && end ? workingDays(start, end, holidays) : null;
  return (
    <ToolPage category="hr" categoryName="HR" title="Working Days Counter" intro="Monday–Friday days between two dates (both included). Add your public holidays to exclude them.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" type="date" value={start} onChange={setStart} />
        <Field label="To" type="date" value={end} onChange={setEnd} />
      </div>
      <label className="mt-4 block">
        <span className="text-sm text-muted-foreground">Holidays (YYYY-MM-DD, separated by commas or new lines)</span>
        <textarea value={hol} onChange={(e) => setHol(e.target.value)} rows={3} placeholder="2026-12-25, 2026-12-26" className="mt-2 w-full rounded-xl border bg-input/30 px-4 py-3 outline-none focus:border-primary" />
      </label>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Working days" value={r ? String(r.working) : "—"} />
        <Stat label="Weekend days" value={r ? String(r.weekend) : "—"} />
        <Stat label="Holidays on weekdays" value={r ? String(r.holidays) : "—"} />
      </div>
      {start && end && !r && <p className="mt-3 text-sm text-destructive">The end date must be after the start date.</p>}
    </ToolPage>
  );
}
