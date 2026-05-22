'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/lib/store/useUiStore';
import { useTimerStore } from '@/lib/store/useTimerStore';
import { pauseTimer } from '@/lib/idb/tasks';
import { addDays, nextWeekday, todayKey } from '@/lib/time/dayKey';

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
}

/** Global keyboard shortcuts: n, t, space, /, ⌘K, esc. */
export function ShortcutsListener() {
  const openEditor = useUiStore((s) => s.openEditor);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setTaskSearchOpen = useUiStore((s) => s.setTaskSearchOpen);
  const closeEditor = useUiStore((s) => s.closeEditor);
  const setHabitsEditorOpen = useUiStore((s) => s.setHabitsEditorOpen);
  const setCurrentDayKey = useUiStore((s) => s.setCurrentDayKey);
  const setView = useUiStore((s) => s.setView);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openEditor();
        return;
      }
      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setCurrentDayKey(todayKey());
        setView('today');
        return;
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        // Jump to the COMING Friday (5 = Fri). If today is Friday, this lands
        // on next week's Friday — matches the move-to-day behavior.
        setCurrentDayKey(nextWeekday(todayKey(), 5));
        setView('today');
        return;
      }
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setTaskSearchOpen(true);
        return;
      }
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const cur = useUiStore.getState().currentDayKey;
        setCurrentDayKey(addDays(cur, -1));
        return;
      }
      if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const cur = useUiStore.getState().currentDayKey;
        setCurrentDayKey(addDays(cur, 1));
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        closeEditor();
        setCommandPaletteOpen(false);
        setHabitsEditorOpen(false);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        const active = useTimerStore.getState().activeTaskId;
        if (active) void pauseTimer(active);
        else {
          // Try the first running candidate from a sortable selection or first task — minimal here.
        }
        return;
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openEditor, setCommandPaletteOpen, setTaskSearchOpen, closeEditor, setHabitsEditorOpen, setCurrentDayKey, setView]);

  return null;
}
