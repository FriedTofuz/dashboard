'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboard.quotes';
const EVENT_NAME = 'dashboard.quotes.change';

const DEFAULT_QUOTES = [
  'Small daily improvements are the key to staggering long-term results.',
  'Done is better than perfect.',
  'You don’t rise to the level of your goals, you fall to the level of your systems.',
  'The secret of your future is hidden in your daily routine.',
  'Discipline equals freedom.',
];

function readStorage(): string[] {
  if (typeof window === 'undefined') return DEFAULT_QUOTES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUOTES.slice();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === 'string')) {
      return parsed;
    }
    return DEFAULT_QUOTES.slice();
  } catch {
    return DEFAULT_QUOTES.slice();
  }
}

function writeStorage(quotes: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/** Hook returning the current quotes list and a setter. Stays in sync across
 *  components in the same tab via a custom event, and across tabs via the
 *  native `storage` event. */
export function useQuotes(): [string[], (quotes: string[]) => void] {
  const [quotes, setQuotesState] = useState<string[]>(() => readStorage());

  useEffect(() => {
    function sync() {
      setQuotesState(readStorage());
    }
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function setQuotes(next: string[]) {
    setQuotesState(next);
    writeStorage(next);
  }

  return [quotes, setQuotes];
}

/** Deterministic per-day index — same quote shows all day, advances next. */
export function quoteIndexForDay(dayKey: string, listLength: number): number {
  if (listLength <= 0) return 0;
  // Days since 2024-01-01 epoch, modulo list length. Stable across reloads.
  const epoch = new Date(2024, 0, 1).getTime();
  const day = new Date(`${dayKey}T00:00:00`).getTime();
  const diffDays = Math.max(0, Math.floor((day - epoch) / 86_400_000));
  return diffDays % listLength;
}
