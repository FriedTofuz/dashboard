'use client';

import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '@/lib/idb/db';
import { useUiStore } from '@/lib/store/useUiStore';

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  userId: string;
}

/** Multi-select dropdown for label assignment. Lets the user toggle labels
 *  and jump to the manage-labels modal. */
export function LabelPicker({ selected, onChange, userId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const setLabelsManagerOpen = useUiStore((s) => s.setLabelsManagerOpen);

  const labels = useLiveQuery(
    () => getDb().labels.where('user_id').equals(userId).sortBy('name'),
    [userId],
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  const selectedLabels = (labels ?? []).filter((l) => selected.includes(l.id));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="row items-center hover:bg-paper-warm transition-colors"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 5,
          padding: '6px 10px',
          background: 'var(--paper)',
          cursor: 'pointer',
          gap: 6,
          flexWrap: 'wrap',
          minHeight: 32,
          width: '100%',
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
          fontSize: 13,
          color: 'var(--ink)',
          textAlign: 'left',
        }}
      >
        {selectedLabels.length === 0 ? (
          <span className="muted" style={{ fontSize: 13 }}>add labels…</span>
        ) : (
          selectedLabels.map((l) => (
            <span
              key={l.id}
              className="ui"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '1px 8px',
                borderRadius: 999,
                background: l.color,
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {l.name}
            </span>
          ))
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="paper"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            padding: 4,
            boxShadow: 'var(--shadow)',
            zIndex: 30,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {(labels ?? []).length === 0 ? (
            <p className="muted italic" style={{ fontSize: 13, padding: '6px 8px' }}>
              no labels yet
            </p>
          ) : (
            (labels ?? []).map((l) => {
              const isSelected = selected.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l.id)}
                  className="row items-center hover:bg-paper-warm transition-colors"
                  style={{
                    width: '100%',
                    gap: 8,
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: l.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="ui"
                    style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}
                  >
                    {l.name}
                  </span>
                  {isSelected && (
                    <span
                      style={{ color: 'var(--sage-deep)', fontSize: 14, fontWeight: 700 }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
          <div style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setLabelsManagerOpen(true);
            }}
            className="hover:bg-paper-warm transition-colors"
            style={{
              width: '100%',
              padding: '6px 8px',
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
              fontSize: 13,
              color: 'var(--ink-faint)',
              textAlign: 'left',
            }}
          >
            ⚙ manage labels…
          </button>
        </div>
      )}
    </div>
  );
}
