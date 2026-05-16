'use client';

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
import { Footer } from '@/components/layout/Footer';
import { RangeView } from '@/components/range/RangeView';
import { ArchiveView } from '@/components/archive/ArchiveView';
import { useEnsureHabitInstances } from '@/lib/hooks/useEnsureHabitInstances';
import { useFlowerState } from '@/lib/hooks/useFlowerState';
import { useUiStore } from '@/lib/store/useUiStore';
import { getDb } from '@/lib/idb/db';

interface DesktopDashboardProps {
  userId: string;
}

export function DesktopDashboard({ userId }: DesktopDashboardProps) {
  const currentDayKey = useUiStore((s) => s.currentDayKey);
  const view = useUiStore((s) => s.view);

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
          className="flex-1 p-8"
          style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}
        >
          {view !== 'archive' && <TopBar />}

          {view === 'today' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', gap: 24 }}>
              <div className="col gap-4 min-w-0">
                <ProgressCard dayKey={currentDayKey} deficitSeconds={deficitSeconds} />

                <div className="col gap-1">
                  <RuleOf3Row dayKey={currentDayKey} />
                </div>

                <HabitsSection dayKey={currentDayKey} />

                <div className="col gap-1">
                  <p className="tiny text-sage-deep">other tasks</p>
                  <TaskList dayKey={currentDayKey} kind="open" />
                </div>

                <div className="col gap-1">
                  <p className="tiny text-sage-deep">done</p>
                  <TaskList dayKey={currentDayKey} kind="done" />
                </div>

                <Footer />
              </div>

              <div className="col gap-4" style={{ width: 460 }}>
                <FlowerCard state={flowerState} />
                <StatsCard userId={userId} dayKey={currentDayKey} deficitSeconds={deficitSeconds} />
                <Notepad dayKey={currentDayKey} userId={userId} />
              </div>
            </div>
          )}

          {view === 'range' && (
            <div className="col gap-4">
              <RangeView />
              <Footer />
            </div>
          )}

          {view === 'archive' && <ArchiveView userId={userId} />}
        </main>
      </DndProvider>

      <TaskEditor userId={userId} />
      <HabitTemplatesEditor userId={userId} />
      <CommandPalette userId={userId} />
    </div>
  );
}
