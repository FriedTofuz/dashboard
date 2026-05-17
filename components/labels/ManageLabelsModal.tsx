'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Label } from '@/lib/idb/db';
import {
  createLabel,
  updateLabel,
  deleteLabel,
  LABEL_COLOR_PRESETS,
} from '@/lib/idb/labels';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast } from '@/lib/store/useToastStore';

interface Props {
  userId: string;
}

export function ManageLabelsModal({ userId }: Props) {
  const open = useUiStore((s) => s.labelsManagerOpen);
  const setOpen = useUiStore((s) => s.setLabelsManagerOpen);

  const labels = useLiveQuery(
    () => getDb().labels.where('user_id').equals(userId).sortBy('sort_order'),
    [userId],
    [],
  );

  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(LABEL_COLOR_PRESETS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!open) return null;

  async function add() {
    const name = draftName.trim();
    if (!name) return;
    await createLabel(
      { name, color: draftColor, sort_order: (labels ?? []).length },
      userId,
    );
    setDraftName('');
  }

  async function remove(label: Label) {
    const ok = await themedConfirm({
      title: `delete label "${label.name}"?`,
      body: 'tasks tagged with this label keep their other labels.',
      confirmLabel: 'delete label',
      cancelLabel: 'keep it',
      danger: true,
    });
    if (!ok) return;
    await deleteLabel(label.id);
    toast(`label "${label.name}" deleted`);
  }

  async function saveRename(label: Label) {
    const name = editingName.trim();
    if (!name || name === label.name) {
      setEditingId(null);
      return;
    }
    await updateLabel(label.id, { name });
    setEditingId(null);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.25)', zIndex: 60 }}
      onClick={() => setOpen(false)}
    >
      <div
        className="ink-box paper rounded-card p-6 max-w-md w-full col gap-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row items-center justify-between">
          <h2 className="font-hand text-h2">labels</h2>
          <button type="button" onClick={() => setOpen(false)} className="tiny">close</button>
        </div>

        <p className="muted" style={{ fontSize: 13 }}>
          tag tasks for cross-cutting context — show up as chips, filterable in archive and search.
        </p>

        {/* Existing labels */}
        <div className="col" style={{ gap: 6 }}>
          {(labels ?? []).length === 0 && (
            <p className="muted caption italic">no labels yet — add your first below.</p>
          )}
          {(labels ?? []).map((l) => (
            <div
              key={l.id}
              className="row items-center"
              style={{ gap: 8, padding: '4px 2px' }}
            >
              <ColorPickerInline
                value={l.color}
                onChange={(c) => void updateLabel(l.id, { color: c })}
              />
              {editingId === l.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => void saveRename(l)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void saveRename(l); }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="font-hand text-body bg-transparent flex-1"
                  style={{
                    border: 'none',
                    borderBottom: '1.5px solid var(--ink-faint)',
                    padding: '2px 4px',
                    outline: 'none',
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditingId(l.id); setEditingName(l.name); }}
                  className="font-hand text-body flex-1 text-left hover:bg-paper-warm transition-colors"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 4px',
                    borderRadius: 4,
                    cursor: 'text',
                  }}
                >
                  {l.name}
                </button>
              )}
              <button
                type="button"
                onClick={() => void remove(l)}
                aria-label={`delete ${l.name}`}
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

        {/* Add new */}
        <div
          className="col"
          style={{
            gap: 8,
            paddingTop: 12,
            borderTop: '1px solid var(--rule)',
          }}
        >
          <label className="tiny">add a label</label>
          <div className="row items-center" style={{ gap: 8 }}>
            <ColorPickerInline value={draftColor} onChange={setDraftColor} />
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); void add(); }
              }}
              placeholder="e.g. Homework, Internship"
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
              disabled={!draftName.trim()}
              className="ink-box-soft font-hand text-body-sm px-3 py-1 hover:wash-sage transition-colors disabled:opacity-50"
              style={{ cursor: draftName.trim() ? 'pointer' : 'default' }}
            >
              add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline color swatch picker ───────────────────────────────────────────

interface ColorPickerInlineProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPickerInline({ value, onChange }: ColorPickerInlineProps) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Pick label color"
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: value,
          border: '1.5px solid var(--ink-soft)',
          cursor: 'pointer',
          padding: 0,
        }}
      />
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 30,
              background: 'transparent',
            }}
          />
          <div
            className="paper"
            style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              border: '1.5px solid var(--ink-soft)',
              borderRadius: 6,
              padding: 6,
              boxShadow: 'var(--shadow)',
              zIndex: 31,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 22px)',
              gap: 4,
            }}
          >
            {LABEL_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false); }}
                aria-label={`select ${c}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: c,
                  border: c === value ? '2px solid var(--ink)' : '1.5px solid var(--ink-soft)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
