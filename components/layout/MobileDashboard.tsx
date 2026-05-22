'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TopBar } from './TopBar';
import { RuleOf3Row } from '@/components/tasks/RuleOf3Row';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { CompletionPrompt } from '@/components/tasks/CompletionPrompt';
import { HabitsSection } from '@/components/tasks/HabitsSection';
import { HabitTemplatesEditor } from '@/components/tasks/HabitTemplatesEditor';
import { NotepadArchiveModal } from '@/components/notepad/NotepadArchiveModal';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { ProgressCard } from '@/components/stats/ProgressCard';
import { StatsCard } from '@/components/stats/StatsCard';
import { StatsActionRow } from '@/components/stats/StatsActionRow';
import { FlowerCard } from '@/components/sunflower/FlowerCard';
import { Notepad } from '@/components/notepad/Notepad';
import { ScratchModal } from '@/components/notepad/ScratchModal';
import { MoveTaskDialog } from '@/components/system/MoveTaskDialog';
import { TimerProvider } from '@/components/timer/TimerProvider';
import { BootProvider } from '@/components/system/BootProvider';
import { DndProvider } from '@/components/dnd/DndProvider';
import { CommandPalette } from '@/components/system/CommandPalette';
import { TaskSearchModal } from '@/components/system/TaskSearchModal';
import { SettingsModal } from '@/components/system/SettingsModal';
import { ShortcutsListener } from '@/components/system/ShortcutsListener';
import { InstallPrompt } from '@/components/system/InstallPrompt';
import { ThemeToggle } from '@/components/system/ThemeToggle';
import { RangeView } from '@/components/range/RangeView';
import { ArchiveView } from '@/components/archive/ArchiveView';
import { DayLabelFilter } from '@/components/labels/DayLabelFilter';
import { ManageLabelsModal } from '@/components/labels/ManageLabelsModal';
import { QuotesManagerModal } from '@/components/system/QuotesManagerModal';
import { useEnsureHabitInstances } from '@/lib/hooks/useEnsureHabitInstances';
import { useFlowerState } from '@/lib/hooks/useFlowerState';
import { useUiStore } from '@/lib/store/useUiStore';
import { getDb } from '@/lib/idb/db';
import { todayKey } from '@/lib/time/dayKey';
import { cn } from '@/lib/utils';

type Tab = 'today' | 'range' | 'notepad' | 'stats' | 'archive';

interface MobileDashboardProps {
  userId: string;
}

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'today', label: 'today', icon: '◉' },
  { id: 'range', label: 'range', icon: '◫' },
  { id: 'notepad', label: 'notes', icon: '✎' },
  { id: 'stats', label: 'stats', icon: '✿' },
  { id: 'archive', label: 'archive', icon: '◰' },
];

export function MobileDashboard({ userId }: MobileDashboardProps) {
  const [tab, setTab] = useState<Tab>('today');
  const currentDayKey = useUiStore((s) => s.currentDayKey);
  const openEditor = useUiStore((s) => s.openEditor);

  useEnsureHabitInstances(currentDayKey, userId);

  const settings = useLiveQuery(() => getDb().settings.get(userId), [userId]);
  const deficitSeconds = settings?.deficit_seconds ?? 0;
  // Sunflower is locked to TODAY — its state and quote shouldn't shift when
  // the user is browsing a past or future day.
  const today = todayKey();
  const flowerState = useFlowerState(today, deficitSeconds);

  return (
    <div className="min-h-screen col">
      <BootProvider userId={userId} />
      <TimerProvider />
      <ShortcutsListener userId={userId} />

      <DndProvider>
        <main
          className="flex-1"
          style={{ padding: '24px 20px 116px', minWidth: 0 }}
        >
          {tab === 'today' && (
            <div className="col" style={{ gap: 24 }}>
              <TopBar />
              <ProgressCard dayKey={currentDayKey} deficitSeconds={deficitSeconds} />
              <RuleOf3Row dayKey={currentDayKey} />
              <div className="col" style={{ gap: 10 }}>
                <DayLabelFilter userId={userId} />
                <TaskList dayKey={currentDayKey} showAddRow />
              </div>
              <HabitsSection dayKey={currentDayKey} />
              <div className="row" style={{ gap: 12, paddingTop: 4 }}>
                <ThemeToggle />
              </div>
            </div>
          )}

          {tab === 'range' && <RangeView userId={userId} />}

          {tab === 'notepad' && (
            <div className="col" style={{ gap: 14, height: '80vh' }}>
              <h2
                className="hand"
                style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}
              >
                <span className="underline-hand">notes</span>
              </h2>
              <Notepad
                dayKey={currentDayKey}
                userId={userId}
                className="flex-1"
              />
            </div>
          )}

          {tab === 'stats' && (
            <div className="col" style={{ gap: 18 }}>
              <h2
                className="hand"
                style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}
              >
                <span className="underline-hand">stats</span>
              </h2>
              <FlowerCard
                state={flowerState}
                dayKey={today}
                userId={userId}
              />
              <StatsActionRow userId={userId} showCalendar={false} />
              <StatsCard
                userId={userId}
                dayKey={today}
                deficitSeconds={deficitSeconds}
                mobile
              />
            </div>
          )}

          {tab === 'archive' && <ArchiveView userId={userId} />}
        </main>

        {tab === 'today' && (
          <button
            type="button"
            onClick={() => openEditor()}
            className="fixed wobble hover:bg-paper-warm transition-colors"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
              right: 20,
              background: 'var(--paper)',
              border: '1.5px solid var(--ink)',
              borderRadius: '999px',
              padding: '14px 20px',
              fontFamily: 'var(--font-hand), cursive',
              fontWeight: 600,
              fontSize: 24,
              boxShadow: 'var(--shadow)',
              zIndex: 10,
            }}
            aria-label="Add task"
          >
            +
          </button>
        )}

        {/* Bottom tab bar — floating, locked above safe-area, rounded card */}
        <nav
          className="fixed paper wobble no-print"
          style={{
            left: 12,
            right: 12,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 12,
            boxShadow: '0 6px 18px rgba(28, 24, 20, 0.18)',
            transform: 'translateZ(0)',
            zIndex: 30,
          }}
        >
          <div className="row items-stretch justify-around">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="col items-center"
                  style={{
                    flex: 1,
                    padding: '8px 0 10px',
                    gap: 2,
                    position: 'relative',
                    color: active ? 'var(--terra-deep)' : 'var(--ink-faint)',
                  }}
                  aria-label={t.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    aria-hidden
                    className={cn(active && 'wobble')}
                    style={{
                      fontSize: 20,
                      lineHeight: 1,
                      color: active ? 'var(--terra)' : 'var(--ink-faint)',
                    }}
                  >
                    {t.icon}
                  </span>
                  <span
                    className="ui"
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '20%',
                        right: '20%',
                        height: 3,
                        background: 'var(--terra)',
                        borderRadius: 2,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </DndProvider>

      <TaskEditor userId={userId} />
      <HabitTemplatesEditor userId={userId} />
      <CompletionPrompt />
      <NotepadArchiveModal userId={userId} />
      <ScratchModal dayKey={currentDayKey} userId={userId} />
      <MoveTaskDialog />
      <ConfirmDialog />
      <CommandPalette userId={userId} />
      <TaskSearchModal userId={userId} />
      <SettingsModal />
      <ManageLabelsModal userId={userId} />
      <QuotesManagerModal />
      <InstallPrompt />
    </div>
  );
}
