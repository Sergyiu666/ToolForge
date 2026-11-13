import { useI18n } from "@/components/LanguageProvider";
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, Stat, ToolPage, meta, num } from '@/components/ToolPage';
import { vacationBalance, type Leave } from '@/lib/vacation';

export const Route = createFileRoute('/tools/hr/vacation-tracker')({
  head: () => meta('Vacation Day Tracker — Toolforge', 'Track leave used and remaining days, excluding weekends and Romanian public holidays.'),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const [allowance, setAllowance] = useState('');
  const [carry, setCarry] = useState('0');
  const [leaves, setLeaves] = useState<Leave[]>([{ start: '', end: '' }]);
  const a = num(allowance), c = num(carry) || 0;
  const r = vacationBalance(Number.isFinite(a) ? a : 0, c, leaves);
  const update = (i: number, k: keyof Leave, v: string) => setLeaves(ls => ls.map((l, j) => j === i ? { ...l, [k]: v } : l));
  return <ToolPage category="hr" categoryName={t("HR")} title={t("Vacation Day Tracker")} intro={t("Weekdays only · Romanian public holidays excluded (2024–2027)")}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("Annual allowance (days)")} value={allowance} onChange={setAllowance} placeholder={t("Per your contract")} />
      <Field label={t("Carried over (days)")} value={carry} onChange={setCarry} />
    </div>
    <div className="mt-6 space-y-3">
      <div className="text-sm text-muted-foreground">{t("Leave periods")}</div>
      {leaves.map((l, i) => {
        const days = r.rows[i]?.days;
        return <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <Field label={t("From")} type="date" value={l.start} onChange={v => update(i, 'start', v)} />
          <Field label={t("To")} type="date" value={l.end} onChange={v => update(i, 'end', v)} />
          <div className="pb-3 text-sm">{days == null ? (l.start && l.end ? <span className="text-destructive">{t("Invalid")}</span> : '—') : t("{0} days", days)}</div>
          <button type="button" aria-label={t("Remove period")} onClick={() => setLeaves(ls => ls.length > 1 ? ls.filter((_, j) => j !== i) : [{ start: '', end: '' }])} className="mb-1 rounded-xl border p-3 hover:border-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>;
      })}
      <button type="button" onClick={() => setLeaves(ls => [...ls, { start: '', end: '' }])} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:border-primary"><Plus className="h-4 w-4" />{t("Add period")}</button>
    </div>
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      <Stat label={t("Total available")} value={String(r.total)} />
      <Stat label={t("Days used")} value={String(r.used)} />
      <Stat label={t("Remaining")} value={String(r.remaining)} />
    </div>
    {r.remaining < 0 && <p role="alert" className="mt-3 text-sm text-destructive">{t("Leave taken exceeds the available balance.")}</p>}
    <p className="mt-4 text-xs text-muted-foreground">{t("Overlapping periods are counted once. Enter the allowance from the employment contract; nothing is saved.")}</p>
  </ToolPage>;
}
