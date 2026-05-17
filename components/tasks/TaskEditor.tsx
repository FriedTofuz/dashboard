'use client';

import { useEffect, useState } from 'react';
import { createTask, updateTask } from '@/lib/idb/tasks';
import { setTaskLabels, getLabelsForTask } from '@/lib/idb/labels';
import { useUiStore } from '@/lib/store/useUiStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, type Subtask } from '@/lib/idb/db';
import { LabelPicker } from '@/components/labels/LabelPicker';
import { toast, toastWarn } from '@/lib/store/useToastStore';
import { cn } from '@/lib/utils';

interface TaskEditorProps {
  userId: string;
}

function newSubtaskId() { return crypto.randomUUID(); }

/** Convert "HH:MM" → minutes since midnight, or null if not parseable. */
function parseTime(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

export function TaskEditor({ userId }: TaskEditorProps) {
  const { isEditorOpen, editingTaskId, currentDayKey, closeEditor } = useUiStore();

  const existingTask = useLiveQuery(
    () => (editingTaskId ? getDb().tasks.get(editingTaskId) : undefined),
    [editingTaskId],
  );

  const [title, setTitle] = useState('');
  const [est, setEst] = useState('25');
  const [desc, setDesc] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [isChecklist, setIsChecklist] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Load existing task once the record is available.
  useEffect(() => {
    if (!isEditorOpen) return;
    if (!editingTaskId) {
      setTitle('');
      setEst('25');
      setDesc('');
      setLabelIds([]);
      setIsChecklist(false);
      setSubtasks([]);
      setNewSubtaskTitle('');
      setStartTime('');
      setEndTime('');
      setTimeError(null);
      setLoadedFor('__new__');
      return;
    }
    if (existingTask && loadedFor !== editingTaskId) {
      setTitle(existingTask.title);
      setEst(String(existingTask.est_minutes));
      setDesc(existingTask.description ?? '');
      const stList = existingTask.subtasks ?? [];
      setIsChecklist(stList.length > 0);
      setSubtasks(stList);
      setNewSubtaskTitle('');
      setStartTime(existingTask.start_time ?? '');
      setEndTime(existingTask.end_time ?? '');
      setTimeError(null);
      void getLabelsForTask(existingTask.id).then(setLabelIds);
      setLoadedFor(editingTaskId);
    }
  }, [isEditorOpen, editingTaskId, existingTask, loadedFor]);

  function addSubtask() {
    const t = newSubtaskTitle.trim();
    if (!t) return;
    setSubtasks([...subtasks, { id: newSubtaskId(), title: t, done: false }]);
    setNewSubtaskTitle('');
  }

  function updateSubtask(id: string, changes: Partial<Subtask>) {
    setSubtasks(subtasks.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }

  function removeSubtask(id: string) {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  }

  /** Validate time range fields. Returns parsed minutes or null. */
  function validateTimes(): { start: number | null; end: number | null; ok: boolean } {
    setTimeError(null);
    const start = startTime ? parseTime(startTime) : null;
    const end = endTime ? parseTime(endTime) : null;
    if (startTime && start === null) {
      setTimeError('start time must be HH:MM (24-hour)');
      return { start: null, end: null, ok: false };
    }
    if (endTime && end === null) {
      setTimeError('end time must be HH:MM (24-hour)');
      return { start: null, end: null, ok: false };
    }
    if (start !== null && end !== null && end <= start) {
      setTimeError('end must be after start');
      return { start: null, end: null, ok: false };
    }
    return { start, end, ok: true };
  }

  /** Find overlapping tasks on the same day. Each side may have an open range. */
  async function findOverlapWarnings(
    taskId: string | null,
    dayKey: string | null,
    startMin: number | null,
    endMin: number | null,
  ): Promise<string[]> {
    if (!dayKey || (startMin === null && endMin === null)) return [];
    const peers = await getDb()
      .tasks.where('day_key')
      .equals(dayKey)
      .filter((t) => !t.archived && t.id !== taskId && (t.start_time != null || t.end_time != null))
      .toArray();
    const conflicts: string[] = [];
    for (const p of peers) {
      const ps = parseTime(p.start_time);
      const pe = parseTime(p.end_time);
      // Build half-open intervals using a large fallback for unknown sides.
      const aStart = startMin ?? 0;
      const aEnd = endMin ?? 24 * 60;
      const bStart = ps ?? 0;
      const bEnd = pe ?? 24 * 60;
      if (aStart < bEnd && bStart < aEnd) conflicts.push(p.title);
    }
    return conflicts;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const estVal = parseInt(est, 10);
    if (isNaN(estVal) || estVal <= 0) return;

    const times = validateTimes();
    if (!times.ok) return;

    const finalSubtasks = isChecklist && subtasks.length > 0 ? subtasks : null;

    let id = editingTaskId;
    if (editingTaskId) {
      await updateTask(editingTaskId, {
        title: title.trim(),
        est_minutes: estVal,
        description: desc || undefined,
        subtasks: finalSubtasks,
        start_time: startTime || null,
        end_time: endTime || null,
      });
    } else {
      id = await createTask(
        {
          day_key: currentDayKey,
          template_id: null,
          title: title.trim(),
          est_minutes: estVal,
          description: desc || undefined,
          state: 'open',
          started_at: null,
          elapsed_ms: 0,
          actual_ms: null,
          completed_at: null,
          r3_slot: null,
          sort_order: Date.now(),
          skipped: false,
          archived: false,
          subtasks: finalSubtasks,
          start_time: startTime || null,
          end_time: endTime || null,
        },
        userId,
      );
    }

    if (id) await setTaskLabels(id, labelIds, userId);

    // Overlap warning — fire after save so the user sees it as a toast,
    // doesn't block them from saving.
    const conflicts = await findOverlapWarnings(
      id,
      currentDayKey,
      times.start,
      times.end,
    );
    if (conflicts.length > 0) {
      toastWarn(
        `time overlap with ${conflicts.length === 1 ? `"${conflicts[0]}"` : `${conflicts.length} other tasks`}`,
      );
    } else if (startTime || endTime) {
      toast('time saved');
    }

    setTitle('');
    setEst('25');
    setDesc('');
    setLabelIds([]);
    setIsChecklist(false);
    setSubtasks([]);
    setStartTime('');
    setEndTime('');
    setTimeError(null);
    setLoadedFor(null);
    closeEditor();
  }

  function handleClose() {
    setTitle('');
    setEst('25');
    setDesc('');
    setLabelIds([]);
    setIsChecklist(false);
    setSubtasks([]);
    setStartTime('');
    setEndTime('');
    setTimeError(null);
    setLoadedFor(null);
    closeEditor();
  }

  if (!isEditorOpen) return null;

  const checklistProgress = subtasks.length > 0
    ? `${subtasks.filter((s) => s.done).length}/${subtasks.length}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(43,38,34,0.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="paper ink-box-soft col gap-5 p-8 w-full max-w-2xl rounded-card"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 className="font-hand text-h3">
          {editingTaskId ? 'edit task' : 'new task'}
        </h2>

        <div className="col gap-1">
          <label className="tiny">task</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="what needs doing?"
            autoFocus
            required
            className={cn(
              'font-hand text-body bg-transparent border-b border-ink-faint py-1',
              'focus:outline-none focus:border-ink',
              'placeholder:text-ink-faint',
            )}
          />
        </div>

        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div className="col gap-1" style={{ flex: '0 0 120px' }}>
            <label className="tiny">estimate (min)</label>
            <input
              type="number"
              value={est}
              onChange={(e) => setEst(e.target.value)}
              min="1"
              required
              className={cn(
                'font-hand text-body bg-transparent border-b border-ink-faint py-1',
                'focus:outline-none focus:border-ink',
              )}
            />
          </div>

          <div className="col gap-1" style={{ flex: '0 0 120px' }}>
            <label className="tiny">start (optional)</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setTimeError(null); }}
              className={cn(
                'font-hand text-body bg-transparent border-b border-ink-faint py-1',
                'focus:outline-none focus:border-ink',
              )}
            />
          </div>

          <div className="col gap-1" style={{ flex: '0 0 120px' }}>
            <label className="tiny">end (optional)</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => { setEndTime(e.target.value); setTimeError(null); }}
              className={cn(
                'font-hand text-body bg-transparent border-b border-ink-faint py-1',
                'focus:outline-none focus:border-ink',
              )}
            />
          </div>
        </div>

        {timeError && (
          <p
            className="ui"
            style={{ color: 'var(--terra-deep)', fontSize: 13, marginTop: -8 }}
          >
            {timeError}
          </p>
        )}

        <div className="col gap-1">
          <label className="tiny">labels</label>
          <LabelPicker selected={labelIds} onChange={setLabelIds} userId={userId} />
        </div>

        {/* ── Checklist toggle + subtasks ─────────────────────────────── */}
        <div className="col gap-2">
          <label
            className="row items-center"
            style={{ gap: 8, cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={isChecklist}
              onChange={(e) => {
                setIsChecklist(e.target.checked);
                if (!e.target.checked) setSubtasks([]);
              }}
            />
            <span className="font-hand text-body-sm">
              make this a checklist
            </span>
            {checklistProgress && (
              <span className="tiny num muted" style={{ marginLeft: 4 }}>
                {checklistProgress}
              </span>
            )}
          </label>

          {isChecklist && (
            <div
              className="col"
              style={{
                gap: 4,
                paddingLeft: 24,
                paddingTop: 4,
              }}
            >
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  className="row items-center"
                  style={{ gap: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={(e) => updateSubtask(s.id, { done: e.target.checked })}
                  />
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => updateSubtask(s.id, { title: e.target.value })}
                    className={cn(
                      'hand flex-1',
                      s.done && 'strike',
                    )}
                    style={{
                      fontSize: 17,
                      border: 'none',
                      borderBottom: '1px solid var(--rule)',
                      background: 'transparent',
                      padding: '2px 4px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSubtask(s.id)}
                    aria-label="remove subtask"
                    className="hover:bg-paper-warm transition-colors"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--terra-deep)',
                      padding: 4,
                      borderRadius: 3,
                      cursor: 'pointer',
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="row items-center" style={{ gap: 6 }}>
                <span style={{ width: 16, flexShrink: 0 }} />
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
                  }}
                  placeholder="+ add subtask"
                  className="hand flex-1"
                  style={{
                    fontSize: 16,
                    border: 'none',
                    borderBottom: '1px dashed var(--ink-faint)',
                    background: 'transparent',
                    padding: '2px 4px',
                    outline: 'none',
                    color: 'var(--ink-faint)',
                  }}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="ui hover:bg-paper-warm transition-colors disabled:opacity-50"
                  style={{
                    border: '1.5px solid var(--ink-soft)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    background: 'transparent',
                    color: 'var(--ink)',
                    fontSize: 12,
                    cursor: newSubtaskTitle.trim() ? 'pointer' : 'default',
                  }}
                >
                  add
                </button>
              </div>
              <p
                className="ui muted italic"
                style={{ fontSize: 11, marginTop: 4 }}
              >
                subtasks don&apos;t get labels — they live under the parent.
              </p>
            </div>
          )}
        </div>

        <div className="col gap-1">
          <label className="tiny">notes (optional)</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="sub-tasks, phone numbers, details…"
            rows={3}
            className={cn(
              'font-hand text-body-sm bg-transparent border border-ink-faint rounded-input p-2',
              'focus:outline-none focus:border-ink resize-none',
              'placeholder:text-ink-faint',
            )}
          />
        </div>

        <div className="row gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="font-hand text-body muted hover:text-ink transition-colors"
          >
            cancel
          </button>
          <button
            type="submit"
            className="ink-box font-hand text-body px-4 py-1.5 hover:bg-sage-wash transition-colors"
          >
            {editingTaskId ? 'save' : 'add task'}
          </button>
        </div>
      </form>
    </div>
  );
}
