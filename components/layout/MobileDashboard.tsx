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
import { FlowerCard } from '@/components/sunflower/FlowerCard';
import { Notepad } from '@/components/notepad/Notepad';
import { TimerProvider } from '@/components/timer/TimerProvider';
import { BootProvider } from '@/components/system/BootProvider';
import { DndProvider } from '@/components/dnd/DndProvider';
import { CommandPalette } from '@/components/system/CommandPalette';
import { ShortcutsListener } from '@/components/system/ShortcutsListener';
import { InstallPrompt } from '@/components/system/InstallPrompt';
import { ThemeToggle } from '@/components/system/ThemeToggle';
import { RangeView } from '@/components/range/RangeView';
import { ArchiveView } from '@/components/archive/ArchiveView';
import { useEnsureHabitInstances } from '@/lib/hooks/useEnsureHabitInstances';
import { useFlowerState } from '@/lib/hooks/useFlowerState';
import { useUiStore } from '@/lib/store/useUiStore';
import { getDb } from '@/lib/idb/db';
import { cn } from '@/lib/utils';

type Tab = 'today' | 'range' | 'notepad' | 'stats' | 'archive';

interface MobileDashboardProps {
  userId: string;
}

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'today', label: 'today', icon: '☀' },
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
  const flowerState = useFlowerState(currentDayKey, deficitSeconds);

  return (
    <div className="min-h-screen col">
      <BootProvider userId={userId} />
      <TimerProvider />
      <ShortcutsListener />

      <DndProvider>
        <main
          className="flex-1"
          style={{ padding: '24px 20px 96px', minWidth: 0 }}
        >
          {tab === 'today' && (
            <div className="col" style={{ gap: 24 }}>
              <TopBar />
              <ProgressCard dayKey={currentDayKey} deficitSeconds={deficitSeconds} />
              <RuleOf3Row dayKey={currentDayKey} />
              <HabitsSection dayKey={currentDayKey} />
              <div className="col" style={{ gap: 10 }}>
                <p className="section-head muted">Tasks</p>
                <TaskList dayKey={currentDayKey} kind="open" showAddRow />
              </div>
              <div className="col" style={{ gap: 10 }}>
                <p className="section-head sage">Done</p>
                <TaskList dayKey={currentDayKey} kind="done" />
              </div>
              <div className="row" style={{ gap: 12, paddingTop: 4 }}>
                <ThemeToggle />
              </div>
            </div>
          )}

          {tab === 'range' && <RangeView />}

          {tab === 'notepad' && (
            <div className="col" style={{ gap: 14, height: '80vh' }}>
              <h2
                className="hand"
                style={{ fontSize: 32, lineHeight: 1, fontWeight: 700 }}
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
                style={{ fontSize: 32, lineHeight: 1, fontWeight: 700 }}
              >
                <span className="underline-hand">stats</span>
              </h2>
              <FlowerCard
                state={flowerState}
                dayKey={currentDayKey}
                userId={userId}
              />
              <StatsCard
                userId={userId}
                dayKey={currentDayKey}
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
              bottom: 84,
              right: 20,
              background: 'var(--paper)',
              border: '1.5px solid var(--ink)',
              borderRadius: '999px',
              padding: '14px 20px',
              fontFamily: 'var(--font-hand), cursive',
              fontWeight: 700,
              fontSize: 26,
              boxShadow: 'var(--shadow)',
              zIndex: 10,
            }}
            aria-label="Add task"
          >
            +
          </button>
        )}

        {/* Bottom tab bar — §9 #4: terra underline + terra icon for active */}
        <nav
          className="fixed left-0 right-0 bottom-0 paper no-print"
          style={{
            borderTop: '1px solid var(--ink-faint)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            zIndex: 20,
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
      <ConfirmDialog />
      <CommandPalette userId={userId} />
      <InstallPrompt />
    </div>
  );
}
