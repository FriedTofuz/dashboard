'use client';

import { useEffect } from 'react';
import { ensureHabitInstances } from '@/lib/idb/habits';

/** On dayKey change, materialize today's habit instances if missing. */
export function useEnsureHabitInstances(dayKey: string, userId: string) {
  useEffect(() => {
    if (!userId || !dayKey) return;
    void ensureHabitInstances(dayKey, userId);
  }, [dayKey, userId]);
}
