'use client';

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
import { ScratchModal } from '@/components/notepad/ScratchModal';
import { MoveTaskDialog } from '@/components/system/MoveTaskDialog';
import { TimerProvider } from '@/components/timer/TimerProvider';
import { BootProvider } from '@/components/system/BootProvider';
import { DndProvider } from '@/components/dnd/DndProvider';
import { CommandPalette } from '@/components/system/CommandPalette';
import { TaskSearchModal } from '@/components/system/TaskSearchModal';
import { SettingsModal } from '@/components/system/SettingsModal';
import { ShortcutsListener } from '@/components/system/ShortcutsListener';
import { Footer } from '@/components/layout/Footer';
import { PrintHeader } from '@/components/layout/PrintHeader';
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

interface DesktopDashboardProps {
  userId: string;
}

export function DesktopDashboard({ userId }: DesktopDashboardProps) {
  const currentDayKey = useUiStore((s) => s.currentDayKey);
  const view = useUiStore((s) => s.view);

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
          style={{
            maxWidth: 1500,
            margin: '0 auto',
            width: '100%',
            padding: '36px 44px',
          }}
        >
          <PrintHeader />

          {view !== 'archive' && <TopBar />}

          {view === 'today' && (
            <div
              className="v2-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 480px',
                gap: 36,
                marginTop: 28,
              }}
            >
              <div className="col" style={{ gap: 28, minWidth: 0 }}>
                <ProgressCard dayKey={currentDayKey} deficitSeconds={deficitSeconds} />

                <RuleOf3Row dayKey={currentDayKey} />

                <div className="col" style={{ gap: 10 }}>
                  <DayLabelFilter userId={userId} />
                  <TaskList dayKey={currentDayKey} showAddRow />
                </div>

                <HabitsSection dayKey={currentDayKey} />

                <Footer />
              </div>

              <div className="col" style={{ gap: 28, width: 480 }}>
                <FlowerCard state={flowerState} dayKey={today} userId={userId} />
                <StatsActionRow userId={userId} />
                <StatsCard
                  userId={userId}
                  dayKey={today}
                  deficitSeconds={deficitSeconds}
                />
              </div>
            </div>
          )}

          {view === 'range' && (
            <div className="col" style={{ gap: 24, marginTop: 28 }}>
              <RangeView userId={userId} />
              <Footer />
            </div>
          )}

          {view === 'archive' && <ArchiveView userId={userId} />}
        </main>
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
      <SettingsModal userId={userId} />
      <ManageLabelsModal userId={userId} />
      <QuotesManagerModal />
    </div>
  );
}
