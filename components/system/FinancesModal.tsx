'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { getDb, type FinanceEntry } from '@/lib/idb/db';
import {
  upsertWeeklyEntry,
  deleteFinanceEntry,
  updateFinancePlan,
  formatMoney,
  parseMoney,
  weekStart,
  weekInMonth,
} from '@/lib/idb/finances';

interface FinancesModalProps {
  userId: string;
}

type Tab = 'overview' | 'log' | 'plan';

const NAV: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'log',      label: 'Weekly log' },
  { id: 'plan',     label: 'Budget plan' },
];

/** Big modal for the financial planner — same size as Settings / Logbook.
 *  Three tabs: Overview (budget vs actual, trends, allowance, savings),
 *  Weekly log (add / edit / delete entries), Budget plan (set monthly
 *  budget / allowance / savings target).
 *
 *  No PIN gate — finance data isn't as sensitive as the Logbook, and the
 *  user said "comprehensive page" not "locked". Closable via × in the
 *  sidebar or Esc. */
export function FinancesModal({ userId }: FinancesModalProps) {
  const open = useUiStore((s) => s.financesOpen);
  const close = () => useUiStore.getState().setFinancesOpen(false);
  const [tab, setTab] = useState<Tab>('overview');

  // Esc dismisses.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)', zIndex: 80 }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="finances-title"
    >
      <div
        className="paper wobble"
        style={{
          position: 'relative',
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(1375px, 94vw)',
          height: 'min(875px, 90vh)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* Sidebar */}
        <aside
          className="col"
          style={{
            width: 220,
            borderRight: '1.5px solid var(--rule)',
            background: 'var(--paper-warm)',
            padding: '24px 14px',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <h2
            id="finances-title"
            className="hand"
            style={{
              fontSize: 22,
              lineHeight: 1.1,
              fontWeight: 600,
              margin: '0 0 14px 6px',
              color: 'var(--ink)',
            }}
          >
            Finances
          </h2>
          {NAV.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="ui transition-colors"
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 5,
                  border: 'none',
                  background: active ? 'var(--terra-tint)' : 'transparent',
                  color: active ? 'var(--terra-deep)' : 'var(--ink)',
                  fontWeight: active ? 600 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={close}
            aria-label="Close finances"
            title="Close (Esc)"
            className="ui-b wobble hover:bg-paper-warm transition-colors"
            style={{
              marginTop: 4,
              textAlign: 'center',
              padding: '8px 12px',
              borderRadius: 5,
              border: '1.5px solid var(--ink-soft)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </aside>

        <section
          className="col"
          style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}
        >
          {tab === 'overview' && <OverviewBody userId={userId} />}
          {tab === 'log'      && <WeeklyLogBody userId={userId} />}
          {tab === 'plan'     && <PlanBody userId={userId} />}
        </section>
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────

function OverviewBody({ userId }: { userId: string }) {
  const settings = useLiveQuery(
    () => getDb().settings.get(userId),
    [userId],
  );
  const entries = useLiveQuery(
    () =>
      getDb().finance_entries.where('user_id').equals(userId).toArray(),
    [userId],
    [] as FinanceEntry[],
  );

  const sorted = useMemo(
    () => (entries ?? []).slice().sort((a, b) => a.week_start.localeCompare(b.week_start)),
    [entries],
  );

  // Fresh Date each render; the filter is O(weeks logged) so memoizing
  // saves nothing meaningful, and including a per-render Date in the deps
  // array would defeat the memo anyway.
  const now = new Date();
  const monthEntries = sorted.filter((e) => weekInMonth(e.week_start, now));
  const monthSpend = monthEntries.reduce((s, e) => s + e.spending_cents, 0);
  const monthIncome = monthEntries.reduce((s, e) => s + e.income_cents, 0);

  const budget    = settings?.finance_monthly_budget_cents    ?? null;
  const allowance = settings?.finance_monthly_allowance_cents ?? null;
  const savings   = settings?.finance_savings_target_cents    ?? null;
  const savingsBy = settings?.finance_savings_target_by       ?? null;

  // Pace: how much you've spent vs how much you "should have" spent on a
  // linear pace through the month. Cleaner mental model than projecting.
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const expectedByNow = budget != null
    ? Math.round(budget * (dayOfMonth / daysInMonth))
    : null;
  const pace = budget != null && expectedByNow != null
    ? monthSpend - expectedByNow
    : null;

  // Cumulative net (income − spending) across all logged weeks — proxy for
  // savings-so-far against the target.
  const totalNet = sorted.reduce(
    (s, e) => s + (e.income_cents - e.spending_cents),
    0,
  );

  // Recent 12 weeks for the trend chart.
  const recent = sorted.slice(-12);

  return (
    <div className="col" style={{ padding: '28px 32px', gap: 24 }}>
      <PanelHeading title="Overview" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <StatTile
          label="This month spent"
          value={formatMoney(monthSpend)}
          accent="ink"
        />
        <StatTile
          label="Budget"
          value={budget != null ? formatMoney(budget) : '—'}
          accent="ink"
        />
        <StatTile
          label="Remaining"
          value={budget != null ? formatMoney(budget - monthSpend) : '—'}
          accent={
            budget != null && monthSpend > budget
              ? 'terra'
              : 'sage'
          }
        />
        <StatTile
          label={
            pace == null
              ? 'Pace'
              : pace > 0
                ? `Over pace`
                : 'Under pace'
          }
          value={pace != null ? formatMoney(Math.abs(pace)) : '—'}
          accent={pace != null && pace > 0 ? 'terra' : 'sage'}
        />
      </div>

      <Section title="Weekly trend · last 12 weeks">
        {recent.length === 0 ? (
          <EmptyHint>Log a week to start seeing the trend.</EmptyHint>
        ) : (
          <TrendChart entries={recent} />
        )}
      </Section>

      <Section title="Allowance · income tracking">
        <div className="col" style={{ gap: 6 }}>
          <SimpleRow
            label="Monthly allowance (expected)"
            value={allowance != null ? formatMoney(allowance) : '— set in Budget plan'}
          />
          <SimpleRow
            label="Income this month"
            value={formatMoney(monthIncome)}
          />
          {allowance != null && (
            <SimpleRow
              label="Vs. expected"
              value={formatMoney(monthIncome - allowance)}
              accent={monthIncome >= allowance ? 'sage' : 'terra'}
            />
          )}
        </div>
      </Section>

      <Section title="Savings goal">
        {savings == null ? (
          <EmptyHint>Set a savings target in Budget plan.</EmptyHint>
        ) : (
          <SavingsRow
            target={savings}
            net={totalNet}
            by={savingsBy}
          />
        )}
      </Section>
    </div>
  );
}

function TrendChart({ entries }: { entries: FinanceEntry[] }) {
  // Find the max so we can scale bar heights.
  const max = Math.max(
    1,
    ...entries.flatMap((e) => [e.spending_cents, e.income_cents]),
  );
  const H = 120;
  return (
    <div
      className="row items-end"
      style={{
        gap: 12,
        height: H + 36,
        padding: '6px 4px',
        background: 'var(--paper-warm)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        overflowX: 'auto',
      }}
    >
      {entries.map((e) => {
        const sH = (e.spending_cents / max) * H;
        const iH = (e.income_cents / max) * H;
        const label = e.week_start.slice(5); // MM-DD
        return (
          <div
            key={e.id}
            className="col items-center"
            style={{
              gap: 2,
              minWidth: 44,
              flexShrink: 0,
            }}
            title={`${e.week_start}\nSpend ${formatMoney(e.spending_cents)} · Income ${formatMoney(e.income_cents)}`}
          >
            <div
              className="row items-end"
              style={{ gap: 3, height: H }}
            >
              <div
                aria-hidden
                style={{
                  width: 14,
                  height: sH,
                  background: 'var(--terra)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
              <div
                aria-hidden
                style={{
                  width: 14,
                  height: iH,
                  background: 'var(--sage)',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            </div>
            <span
              className="tiny num"
              style={{
                fontSize: 9,
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div
      className="col"
      style={{ gap: 4, padding: '0 8px 0 4px', alignSelf: 'flex-start' }}
    >
      <LegendDot color="var(--terra)" label="Spending" />
      <LegendDot color="var(--sage)" label="Income" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="row items-center" style={{ gap: 6 }}>
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
        }}
      />
      <span className="ui" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
        {label}
      </span>
    </div>
  );
}

function SavingsRow({
  target, net, by,
}: { target: number; net: number; by: string | null }) {
  const pct = Math.max(0, Math.min(100, (net / target) * 100));
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row items-baseline justify-between">
        <span className="ui" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {formatMoney(Math.max(0, net))} of {formatMoney(target)}
          {by ? ` by ${by}` : ''}
        </span>
        <span
          className="ui-b num"
          style={{
            fontSize: 16,
            color: net >= target ? 'var(--sage-deep)' : 'var(--ink)',
          }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div
        aria-hidden
        style={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          background: 'var(--paper-warm)',
          overflow: 'hidden',
          border: '1px solid var(--rule)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: net >= target ? 'var(--sage)' : 'var(--ochre)',
            transition: 'width 400ms ease-out',
          }}
        />
      </div>
    </div>
  );
}

// ── Weekly log ──────────────────────────────────────────────────────────

function WeeklyLogBody({ userId }: { userId: string }) {
  const entries = useLiveQuery(
    () =>
      getDb()
        .finance_entries.where('user_id')
        .equals(userId)
        .toArray(),
    [userId],
    [] as FinanceEntry[],
  );
  const sorted = useMemo(
    () =>
      (entries ?? [])
        .slice()
        .sort((a, b) => b.week_start.localeCompare(a.week_start)),
    [entries],
  );

  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="col" style={{ padding: '28px 32px', gap: 18 }}>
      <div className="row items-center justify-between">
        <PanelHeading title="Weekly log" />
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ui-b wobble transition-colors"
          style={{
            border: '1.5px solid var(--terra-deep)',
            background: 'var(--terra)',
            color: 'var(--paper)',
            padding: '8px 14px',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          + Log this week
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyHint>
          No weeks logged yet. Pull your Chase total for the week and click
          &ldquo;+ Log this week&rdquo;.
        </EmptyHint>
      ) : (
        <div
          className="col"
          style={{
            border: '1px solid var(--rule)',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <div
            className="row"
            style={{
              padding: '8px 12px',
              background: 'var(--paper-warm)',
              borderBottom: '1px solid var(--rule)',
              gap: 12,
            }}
          >
            <span className="tiny" style={{ flex: 1 }}>Week of</span>
            <span className="tiny" style={{ width: 110, textAlign: 'right' }}>Spending</span>
            <span className="tiny" style={{ width: 110, textAlign: 'right' }}>Income</span>
            <span className="tiny" style={{ width: 110, textAlign: 'right' }}>Net</span>
            <span className="tiny" style={{ width: 80 }}>Actions</span>
          </div>
          {sorted.map((e) => (
            <div
              key={e.id}
              className="row items-center group hover:bg-paper-warm transition-colors"
              style={{
                padding: '10px 12px',
                gap: 12,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <span className="ui-b num" style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {e.week_start}
                </span>
                {e.note && (
                  <span
                    className="ui"
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-faint)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {e.note}
                  </span>
                )}
              </div>
              <span className="ui num" style={{ width: 110, textAlign: 'right', color: 'var(--terra-deep)' }}>
                {formatMoney(e.spending_cents)}
              </span>
              <span className="ui num" style={{ width: 110, textAlign: 'right', color: 'var(--sage-deep)' }}>
                {formatMoney(e.income_cents)}
              </span>
              <span
                className="ui-b num"
                style={{
                  width: 110,
                  textAlign: 'right',
                  color: e.income_cents - e.spending_cents >= 0
                    ? 'var(--sage-deep)'
                    : 'var(--terra-deep)',
                }}
              >
                {formatMoney(e.income_cents - e.spending_cents)}
              </span>
              <div className="row" style={{ width: 80, gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setEditing(e)}
                  className="ui hover:bg-paper-warm transition-colors"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ink-faint)',
                    fontSize: 14,
                    padding: '4px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  aria-label="Edit"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await themedConfirm({
                      title: `delete entry for ${e.week_start}?`,
                      body: 'this is gone for good.',
                      confirmLabel: 'delete',
                      cancelLabel: 'keep it',
                      danger: true,
                    });
                    if (!ok) return;
                    await deleteFinanceEntry(e.id);
                    toast(`deleted ${e.week_start}`);
                  }}
                  className="ui hover:bg-paper-warm transition-colors"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--terra-deep)',
                    fontSize: 14,
                    padding: '4px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  aria-label="Delete"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(adding || editing) && (
        <EntryEditor
          userId={userId}
          entry={editing ?? undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EntryEditor({
  userId, entry, onClose,
}: {
  userId: string;
  entry?: FinanceEntry;
  onClose: () => void;
}) {
  const [week, setWeek] = useState(entry?.week_start ?? weekStart());
  const [spending, setSpending] = useState(
    entry ? (entry.spending_cents / 100).toFixed(2) : '',
  );
  const [income, setIncome] = useState(
    entry ? (entry.income_cents / 100).toFixed(2) : '',
  );
  const [note, setNote] = useState(entry?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sCents = parseMoney(spending);
    const iCents = parseMoney(income);
    if (sCents == null || iCents == null) {
      setError('Spending and income must be valid amounts (e.g. 123.45).');
      return;
    }
    if (sCents < 0 || iCents < 0) {
      setError('Amounts can\'t be negative.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
      setError('Week of must be YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    await upsertWeeklyEntry(
      {
        week_start: week,
        spending_cents: sCents,
        income_cents: iCents,
        note: note.trim(),
      },
      userId,
    );
    toastSuccess(entry ? 'updated' : 'saved');
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.55)', zIndex: 90 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSave}
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(420px, 92vw)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          padding: '22px 24px',
          gap: 12,
        }}
      >
        <h3
          className="hand"
          style={{
            fontSize: 20,
            lineHeight: 1.1,
            fontWeight: 600,
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          {entry ? `Edit ${entry.week_start}` : 'Log a week'}
        </h3>

        <Field label="Week of (Monday, YYYY-MM-DD)" value={week} onChange={setWeek} />
        <Field
          label="Total spending"
          value={spending}
          onChange={setSpending}
          placeholder="123.45"
          numeric
        />
        <Field
          label="Total income"
          value={income}
          onChange={setIncome}
          placeholder="50.00"
          numeric
        />
        <div className="col" style={{ gap: 4 }}>
          <FieldLabel label="Note (optional)" />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="ui"
            style={textareaStyle}
          />
        </div>

        {error && (
          <span className="ui" style={{ fontSize: 12, color: 'var(--terra-deep)' }}>
            {error}
          </span>
        )}

        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={cancelBtnStyle}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="ui-b wobble"
            style={primaryBtnStyle(saving)}
          >
            {entry ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Budget plan ─────────────────────────────────────────────────────────

function PlanBody({ userId }: { userId: string }) {
  const settings = useLiveQuery(
    () => getDb().settings.get(userId),
    [userId],
  );

  const [budget,    setBudget]    = useState('');
  const [allowance, setAllowance] = useState('');
  const [savings,   setSavings]   = useState('');
  const [savingsBy, setSavingsBy] = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);

  // Sync local form state from settings when it loads.
  useEffect(() => {
    if (!settings) return;
    setBudget(centsToInput(settings.finance_monthly_budget_cents));
    setAllowance(centsToInput(settings.finance_monthly_allowance_cents));
    setSavings(centsToInput(settings.finance_savings_target_cents));
    setSavingsBy(settings.finance_savings_target_by ?? '');
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bCents = budget    ? parseMoney(budget)    : null;
    const aCents = allowance ? parseMoney(allowance) : null;
    const sCents = savings   ? parseMoney(savings)   : null;
    if (
      (budget && bCents == null) ||
      (allowance && aCents == null) ||
      (savings && sCents == null)
    ) {
      setError('Amounts must be valid (e.g. 1234.56).');
      return;
    }
    if (savingsBy && !/^\d{4}-\d{2}-\d{2}$/.test(savingsBy)) {
      setError('Savings target date must be YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    await updateFinancePlan(userId, {
      monthly_budget_cents:    bCents,
      monthly_allowance_cents: aCents,
      savings_target_cents:    sCents,
      savings_target_by:       savingsBy || null,
    });
    toastSuccess('plan updated');
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="col" style={{ padding: '28px 32px', gap: 18 }}>
      <PanelHeading title="Budget plan" />
      <p
        className="ui"
        style={{
          fontSize: 13,
          color: 'var(--ink-faint)',
          margin: 0,
          maxWidth: 540,
          lineHeight: 1.45,
        }}
      >
        Set how much you want to spend, expect to receive, and aim to save.
        Leave a field blank if you&apos;d rather not pin a number on it.
      </p>

      <Field
        label="Monthly budget"
        value={budget}
        onChange={setBudget}
        placeholder="800.00"
        numeric
      />
      <Field
        label="Monthly allowance (expected income)"
        value={allowance}
        onChange={setAllowance}
        placeholder="500.00"
        numeric
      />
      <Field
        label="Savings target"
        value={savings}
        onChange={setSavings}
        placeholder="1000.00"
        numeric
      />
      <Field
        label="Savings target date (YYYY-MM-DD)"
        value={savingsBy}
        onChange={setSavingsBy}
        placeholder={`${new Date().getFullYear()}-12-31`}
      />

      {error && (
        <span className="ui" style={{ fontSize: 12, color: 'var(--terra-deep)' }}>
          {error}
        </span>
      )}

      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button
          type="submit"
          disabled={saving}
          className="ui-b wobble"
          style={primaryBtnStyle(saving)}
        >
          Save plan
        </button>
      </div>
    </form>
  );
}

function centsToInput(c: number | null | undefined): string {
  if (c == null) return '';
  return (c / 100).toFixed(2);
}

// ── Atoms ───────────────────────────────────────────────────────────────

function PanelHeading({ title }: { title: string }) {
  return (
    <h3
      className="hand"
      style={{
        fontSize: 24,
        lineHeight: 1.1,
        fontWeight: 600,
        margin: 0,
        color: 'var(--ink)',
      }}
    >
      <span className="underline-hand">{title}</span>
    </h3>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <span
        className="tiny"
        style={{ letterSpacing: '0.14em', color: 'var(--ink-faint)' }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}

function StatTile({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent: 'ink' | 'sage' | 'terra';
}) {
  const color = accent === 'ink'
    ? 'var(--ink)'
    : accent === 'sage'
      ? 'var(--sage-deep)'
      : 'var(--terra-deep)';
  return (
    <div
      className="col"
      style={{
        gap: 4,
        padding: '14px 16px',
        background: 'var(--paper-warm)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
      }}
    >
      <span
        className="tiny"
        style={{ letterSpacing: '0.14em', color: 'var(--ink-faint)' }}
      >
        {label}
      </span>
      <span
        className="ui-b num"
        style={{ fontSize: 22, lineHeight: 1.1, color, letterSpacing: '-0.01em' }}
      >
        {value}
      </span>
    </div>
  );
}

function SimpleRow({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: 'sage' | 'terra';
}) {
  const color = accent === 'sage'
    ? 'var(--sage-deep)'
    : accent === 'terra'
      ? 'var(--terra-deep)'
      : 'var(--ink)';
  return (
    <div
      className="row items-center justify-between"
      style={{
        padding: '6px 0',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <span className="ui" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        {label}
      </span>
      <span
        className="ui-b num"
        style={{ fontSize: 14, color }}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="ui"
      style={{
        fontSize: 13,
        color: 'var(--ink-faint)',
        margin: 0,
        padding: '12px 14px',
        background: 'var(--paper-warm)',
        border: '1px dashed var(--ink-faint)',
        borderRadius: 6,
        lineHeight: 1.45,
      }}
    >
      {children}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--ink-soft)',
  borderRadius: 5,
  background: 'var(--paper)',
  color: 'var(--ink)',
  padding: '8px 10px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 50,
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  border: '1.5px solid var(--ink-soft)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  padding: '10px 14px',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
};

function primaryBtnStyle(saving: boolean): React.CSSProperties {
  return {
    flex: 1,
    border: '1.5px solid var(--sage-deep)',
    background: 'var(--sage)',
    color: 'var(--paper)',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    cursor: saving ? 'not-allowed' : 'pointer',
    opacity: saving ? 0.6 : 1,
  };
}

function FieldLabel({ label }: { label: string }) {
  return (
    <span
      className="tiny"
      style={{ letterSpacing: '0.12em', color: 'var(--ink-faint)' }}
    >
      {label}
    </span>
  );
}

function Field({
  label, value, onChange, placeholder, numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <FieldLabel label={label} />
      <input
        type="text"
        inputMode={numeric ? 'decimal' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={numeric ? 'ui num' : 'ui'}
        style={inputStyle}
      />
    </div>
  );
}
