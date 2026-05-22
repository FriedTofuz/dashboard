'use client';

import { useState } from 'react';
import { formatDayLabel, addDays, todayKey, toDayKey } from '@/lib/time/dayKey';
import { useUiStore } from '@/lib/store/useUiStore';
import { cn } from '@/lib/utils';

function shortWeekday(full: string): string {
  const s = full.slice(0, 3);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Parse "M/D/YY", "MM/DD/YYYY", or "M/D" into a YYYY-MM-DD key. Returns null if invalid. */
function parseSearchDate(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const match = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (!match) return null;
  const [, mStr, dStr, yStr] = match;
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  let y: number;
  if (yStr) {
    y = parseInt(yStr, 10);
    if (yStr.length === 2) y += 2000;
  } else {
    y = new Date().getFullYear();
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null; // overflow check
  return toDayKey(date);
}

export function TopBar() {
  const { currentDayKey, setCurrentDayKey } = useUiStore();
  const today = todayKey();
  const { weekday, monthDay } = formatDayLabel(currentDayKey);
  // Title font: "Monday, May 21" — Caveat hand for warmth without the
  // oversized v2 headline; weekday is capitalized for readability.
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const titleText = `${weekdayCap}, ${monthDay}`;

  // Window of 5 days centered on the selected day (so the user always has
  // ±2 context when they jump to a date via search or the today button)
  const days = [-2, -1, 0, 1, 2].map((offset) => addDays(currentDayKey, offset));

  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const key = parseSearchDate(search);
    if (!key) {
      setSearchError(true);
      return;
    }
    setCurrentDayKey(key);
    setSearch('');
    setSearchError(false);
  }

  return (
    <div className="row items-center justify-between mb-1 gap-6 flex-wrap">
      {/* Date display — "Monday, May 21" on a single line, sized to share a
          baseline with the date-selector pills next to it. */}
      <h1
        className="font-hand v2-date-display"
        style={{
          fontSize: 32,
          lineHeight: 1.1,
          fontWeight: 600,
          margin: 0,
          color: 'var(--ink)',
        }}
      >
        <span className="underline-hand">{titleText}</span>
      </h1>

      {/* Day range pills + reset + search */}
      <div className="row items-center gap-2.5 no-print flex-wrap">
        <button
          type="button"
          onClick={() => setCurrentDayKey(today)}
          disabled={currentDayKey === today}
          className="wobble transition-colors hover:bg-paper-warm disabled:opacity-50"
          style={{
            fontFamily: 'var(--font-hand), cursive',
            fontWeight: 600,
            fontSize: 17,
            color: 'var(--ink-faint)',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 5,
            padding: '4px 10px 5px',
            background: 'var(--paper)',
            cursor: currentDayKey === today ? 'default' : 'pointer',
          }}
          aria-label="Reset to today"
        >
          ← today
        </button>

        <div className="row gap-1.5">
          {days.map((key) => {
            const isSelected = key === currentDayKey;
            const isToday = key === today;
            const [, , d] = key.split('-');
            const { weekday: w } = formatDayLabel(key);

            // Selected = filled terra. Today (when not selected) gets a faint
            // terra ring + dot so you can still find it. Others = plain ink.
            const border = isSelected
              ? '1.5px solid var(--terra-deep)'
              : isToday
                ? '1.5px solid var(--terra)'
                : '1.5px solid var(--ink)';
            const background = isSelected ? 'var(--terra)' : 'transparent';
            const color = isSelected ? 'var(--paper)' : 'var(--ink)';

            return (
              <button
                key={key}
                type="button"
                onClick={() => setCurrentDayKey(key)}
                aria-current={isSelected ? 'date' : undefined}
                className={cn('wobble transition-colors', !isSelected && 'hover:bg-paper-warm')}
                style={{
                  border,
                  background,
                  color,
                  borderRadius: 4,
                  padding: '4px 10px 3px',
                  minWidth: 50,
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <span
                  className="tiny"
                  style={{
                    color: isSelected ? 'var(--paper)' : 'var(--ink-faint)',
                    opacity: isSelected ? 0.9 : 1,
                    display: 'block',
                  }}
                >
                  {shortWeekday(w)}
                </span>
                <span
                  className="ui-b num"
                  style={{ fontSize: 18, lineHeight: 1.2, display: 'block' }}
                >
                  {d}
                </span>
                {isToday && !isSelected && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--terra)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearch}>
          <input
            type="text"
            inputMode="numeric"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (searchError) setSearchError(false);
            }}
            placeholder="MM/DD/YYYY"
            aria-label="Jump to date (month/day/year)"
            className="wobble ui num"
            style={{
              border: `1.5px solid ${searchError ? 'var(--terra-deep)' : 'var(--ink-soft)'}`,
              borderRadius: 5,
              padding: '6px 10px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontSize: 13,
              width: 130,
              outline: 'none',
            }}
          />
        </form>
      </div>
    </div>
  );
}
