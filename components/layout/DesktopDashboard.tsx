'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TopBar } from './TopBar';
import { RuleOf3Row } from '@/components/tasks/RuleOf3Row';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEditor } from '@/components/tasks/TaskEditor';
import { ProgressCard } from '@/components/stats/ProgressCard';
import { StatsCard } from '@/components/stats/StatsCard';
import { FlowerCard } from '@/components/sunflower/FlowerCard';
import { Notepad } from '@/components/notepad/Notepad';
import { TimerProvider } from '@/components/timer/TimerProvider';
import { useUiStore } from '@/lib/store/useUiStore';
import { getDb } from '@/lib/idb/db';
import { computeFlowerState } from '@/lib/compute/flowerState';

interface DesktopDashboardProps {
  userId: string;
}

export function DesktopDashboard({ userId }: DesktopDashboardProps) {
  const { currentDayKey, openEditor } = useUiStore();
  const [notes, setNotes] = useState('');

  const settings = useLiveQuery(
    () => getDb().settings.get(userId),
    [userId],
  );

  const deficitSeconds = settings?.deficit_seconds ?? 0;

  // Flower state — simple same-day calc for v1
  const todayTasks = useLiveQuery(
    () =>
      getDb()
        .tasks.where('day_key')
        .equals(currentDayKey)
        .filter((t) => !t.archived)
        .toArray(),
    [currentDayKey],
    [],
  );

  const r3Done = (todayTasks ?? []).filter((t) => t.r3_slot != null && t.state === 'done').length;
  const bonusDone = (todayTasks ?? []).filter((t) => t.r3_slot == null && t.state === 'done').length;

  const flowerState = computeFlowerState({
    recentDays: [{ r3Done, bonusDone, progressPct: 0 }],
    currentDeficitSeconds: deficitSeconds,
    consecutiveZeroR3Days: r3Done === 0 ? 1 : 0,
  });

  return (
    <div className="min-h-screen col">
      <TimerProvider />

      <main className="flex-1 p-8" style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <TopBar />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', gap: 24 }}>
          {/* Left column */}
          <div className="col gap-4 min-w-0">
            <ProgressCard dayKey={currentDayKey} deficitSeconds={deficitSeconds} />

            <div className="col gap-1">
              <RuleOf3Row dayKey={currentDayKey} />
            </div>

            {/* Open tasks */}
            <div className="col gap-1">
              <TaskList dayKey={currentDayKey} kind="open" />
            </div>

            {/* Done tasks */}
            <div className="col gap-1">
              <p className="tiny text-sage-deep">done</p>
              <TaskList dayKey={currentDayKey} kind="done" />
            </div>

            {/* Footer */}
            <div className="row items-center justify-between mt-2">
              <div className="row gap-3">
                <button
                  type="button"
                  onClick={() => openEditor()}
                  className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors"
                >
                  + add task
                </button>
                <button
                  type="button"
                  className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors muted"
                >
                  archive
                </button>
                <button
                  type="button"
                  className="ink-box-soft font-hand text-body-sm px-4 py-1.5 hover:wash-sage transition-colors muted"
                >
                  settings
                </button>
              </div>
              <span className="tiny muted">last synced · just now</span>
            </div>
          </div>

          {/* Right column */}
          <div className="col gap-4" style={{ width: 460 }}>
            <FlowerCard state={flowerState} />

            <StatsCard
              todayPct={0}
              weekAvgPct={0}
              deficitSeconds={deficitSeconds}
              streakDays={[]}
            />

            <Notepad
              value={notes}
              onChange={setNotes}
              className="flex-1"
              style={{ minHeight: 200 }}
            />
          </div>
        </div>
      </main>

      <TaskEditor userId={userId} />
    </div>
  );
}
