'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@/lib/store/useUiStore';
import { useQuotes } from '@/lib/quotes';
import { cn } from '@/lib/utils';

export function QuotesManagerModal() {
  const open = useUiStore((s) => s.quotesManagerOpen);
  const setOpen = useUiStore((s) => s.setQuotesManagerOpen);
  const [quotes, setQuotes] = useQuotes();
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  function add() {
    const t = draft.trim();
    if (!t) return;
    setQuotes([...quotes, t]);
    setDraft('');
  }

  function remove(i: number) {
    setQuotes(quotes.filter((_, idx) => idx !== i));
  }

  function commitEdit() {
    if (editingIndex === null) return;
    const t = editingText.trim();
    if (!t) {
      remove(editingIndex);
    } else {
      const next = quotes.slice();
      next[editingIndex] = t;
      setQuotes(next);
    }
    setEditingIndex(null);
    setEditingText('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(28, 24, 20, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotes-title"
    >
      <div
        className="ink-box-soft paper rounded-card p-8 w-full col gap-5 max-h-[95vh] overflow-y-auto"
        style={{ maxWidth: 900 }}
      >
        <div className="row items-center justify-between">
          <h2 id="quotes-title" className="font-hand text-h2">quotes</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="tiny"
            aria-label="Close quotes manager"
          >
            close
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          one quote shows above the sunflower each day, cycling through this
          list. add your favorites; edit by clicking a line.
        </p>

        <div className="col" style={{ gap: 2 }}>
          {quotes.length === 0 && (
            <p className="muted caption italic">no quotes yet — add one below.</p>
          )}
          {quotes.map((q, i) => (
            <div
              key={i}
              className="row items-center"
              style={{ gap: 6, padding: '1px 2px' }}
            >
              {editingIndex === i ? (
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    if (e.key === 'Escape') { setEditingIndex(null); }
                  }}
                  autoFocus
                  className="font-hand text-body bg-transparent flex-1"
                  style={{
                    border: 'none',
                    borderBottom: '1.5px solid var(--ink-faint)',
                    padding: '1px 4px',
                    outline: 'none',
                    fontSize: 14,
                    lineHeight: 1.25,
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditingIndex(i); setEditingText(q); }}
                  className={cn(
                    'font-hand flex-1 text-left hover:bg-paper-warm transition-colors',
                  )}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '1px 6px',
                    borderRadius: 4,
                    cursor: 'text',
                    fontStyle: 'italic',
                    color: 'var(--ink-soft)',
                    fontSize: 14,
                    lineHeight: 1.25,
                  }}
                >
                  &ldquo;{q}&rdquo;
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Delete quote"
                className="hover:bg-paper-warm transition-colors"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--terra-deep)',
                  fontSize: 14,
                  padding: 4,
                  borderRadius: 3,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div
          className="col"
          style={{ gap: 8, paddingTop: 12, borderTop: '1px solid var(--rule)' }}
        >
          <label className="tiny">add a quote</label>
          <div className="row items-center" style={{ gap: 8 }}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); add(); }
              }}
              placeholder="e.g. small daily improvements…"
              className="font-hand text-body bg-transparent flex-1"
              style={{
                border: 'none',
                borderBottom: '1.5px solid var(--ink-faint)',
                padding: '4px 2px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={add}
              disabled={!draft.trim()}
              className="ink-box-soft font-hand text-body-sm px-3 py-1 hover:wash-sage transition-colors disabled:opacity-50"
              style={{ cursor: draft.trim() ? 'pointer' : 'default' }}
            >
              add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
