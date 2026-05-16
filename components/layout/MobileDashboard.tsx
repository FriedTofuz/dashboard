'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TopBar } from './TopBar';
import { RuleOf3Row } from '@/components/tasks/RuleOf3Row';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { HabitsSection } from '@/components/tasks/HabitsSection';
import { HabitTemplatesEditor } from '@/components/tasks/HabitTemplatesEditor';
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
        <main className="flex-1 px-4 py-5 pb-24">
          {tab === 'today' && (
            <div className="col gap-4">
              <TopBar />
              <ProgressCard dayKey={currentDayKey} deficitSeconds={deficitSeconds} />
              <RuleOf3Row dayKey={currentDayKey} />
              <HabitsSection dayKey={currentDayKey} />
              <div className="col gap-1">
                <p className="tiny text-sage-deep">other tasks</p>
                <TaskList dayKey={currentDayKey} kind="open" />
              </div>
              <div className="col gap-1">
                <p className="tiny text-sage-deep">done</p>
                <TaskList dayKey={currentDayKey} kind="done" />
              </div>
            </div>
          )}

          {tab === 'range' && <RangeView />}

          {tab === 'notepad' && (
            <div className="col gap-3 h-[80vh]">
              <h2 className="font-hand text-h2">
                <span className="underline-hand">notes</span>
              </h2>
              <Notepad dayKey={currentDayKey} userId={userId} className="flex-1" />
            </div>
          )}

          {tab === 'stats' && (
            <div className="col gap-3">
              <h2 className="font-hand text-h2">
                <span className="underline-hand">stats</span>
              </h2>
              <FlowerCard state={flowerState} />
              <StatsCard userId={userId} dayKey={currentDayKey} deficitSeconds={deficitSeconds} />
            </div>
          )}

          {tab === 'archive' && <ArchiveView userId={userId} />}
        </main>

        {/* Floating add button */}
        {tab === 'today' && (
          <button
            type="button"
            onClick={() => openEditor()}
            className="fixed bottom-20 right-5 ink-box paper rounded-full font-hand text-h2 px-5 py-3 shadow-lg hover:wash-sage transition-colors z-10"
            aria-label="Add task"
          >
            +
          </button>
        )}

        {/* Bottom tab bar */}
        <nav
          className="fixed bottom-0 left-0 right-0 paper border-t z-20"
          style={{
            borderColor: 'var(--ink-faint)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="row items-stretch justify-around">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'col items-center gap-0.5 flex-1 py-2 transition-colors',
                  tab === t.id ? 'text-terra-deep' : 'muted',
                )}
                aria-label={t.label}
                aria-current={tab === t.id ? 'page' : undefined}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="font-hand text-[11px]">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </DndProvider>

      <TaskEditor userId={userId} />
      <HabitTemplatesEditor userId={userId} />
      <CommandPalette userId={userId} />
      <InstallPrompt />
    </div>
  );
}
