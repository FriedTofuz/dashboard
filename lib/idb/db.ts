import Dexie, { type Table } from 'dexie';

export type TaskState = 'open' | 'running' | 'paused' | 'done';
export type Recurrence = 'daily' | 'weekday' | 'weekly' | 'custom';

export type HabitKind = 'habit' | 'workout';

/** One exercise within a workout day. */
export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: string;   // free-form: "135 lb", "bodyweight"
  notes?: string;
}

/** Per-weekday workout plan. Keyed by 0-6 (Sun-Sat). */
export type WorkoutData = {
  [dayOfWeek: number]: {
    title?: string;           // e.g. "Leg day"
    exercises: WorkoutExercise[];
  };
};

/** Per-task workout progress — tracks which sets of which exercise are done. */
export type WorkoutProgress = {
  [exerciseId: string]: {
    setsDone: number;
  };
};

/** Per-task label assignments — keyed by labelId for O(1) lookup. */
export type LabelIdList = string[];

/** Subtask checklist item. Stored as a jsonb array on the parent Task. */
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  day_key: string | null;
  template_id: string | null;
  title: string;
  description?: string;
  est_minutes: number;
  state: TaskState;
  started_at: number | null;    // epoch ms; null when not running
  elapsed_ms: number;           // accumulated across pauses
  actual_ms: number | null;     // set on completion
  completed_at: number | null;
  completion_note?: string;
  r3_slot: 1 | 2 | 3 | null;
  sort_order: number;
  skipped: boolean;
  archived: boolean;
  /** Workout-kind tasks only: per-exercise sets-completed counters. */
  workout_progress?: WorkoutProgress | null;
  /** Cached array of label IDs. Source of truth is the task_labels table. */
  label_ids?: LabelIdList;
  /** Optional checklist of subtasks. When present, the task acts as a folder. */
  subtasks?: Subtask[] | null;
  /** Optional time window for the task (HH:MM 24h, e.g. "09:00"). */
  start_time?: string | null;
  end_time?: string | null;
  /** Snapshot of the originating habit template's title. Populated when the
   *  task is materialized from a habit. Persists after the template is
   *  deleted so the row can still be rendered in the habit section. */
  habit_title?: string | null;
  created_at: number;
  updated_at: number;
}

export interface HabitTemplate {
  id: string;
  user_id: string;
  title: string;
  est_minutes: number;
  recurrence: Recurrence;
  recurrence_days: number[] | null;  // 0–6 (Sun–Sat)
  weight: number;                    // default 1.0
  active: boolean;
  sort_order: number;
  /** 'habit' (default) or 'workout' — workout templates carry a per-weekday plan. */
  kind: HabitKind;
  /** Only populated when kind === 'workout'. */
  workout_data?: WorkoutData | null;
  created_at: number;
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;            // hex, e.g. "#B85C3E"
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface TaskLabel {
  /** Compound primary key: `${task_id}|${label_id}`. */
  id: string;
  task_id: string;
  label_id: string;
  user_id: string;
  created_at: number;
}

export interface Day {
  user_id: string;
  day_key: string;                   // compound PK
  notes: string;
  flower_state: 'thriving' | 'healthy' | 'drooping' | 'wilting';
  deficit_seconds: number;           // end-of-day snapshot
  /** Epoch ms when the user explicitly logged this day via the Log Day
   *  button. Only logged days count toward cumulative stats / streak.
   *  null = unlogged (transient — stats ignore it). */
  logged_at: number | null;
}

export interface NotepadPage {
  id: string;
  user_id: string;
  title: string;
  body: string;
  archived: boolean;
  archived_at: number | null;
  sort_order: number;
  updated_at: number;
}

export interface Settings {
  user_id: string;
  range_window_days: number;
  deficit_seconds: number;           // cumulative running tally
  push_subscription: PushSubscriptionJSON | null;
  reduced_motion: boolean;
  updated_at: number;
}

export interface WriteQueueItem {
  id?: number;                       // autoincrement
  op: 'upsert' | 'delete';
  table: string;
  row_id: string;
  payload: unknown;
  attempted_at: number;
  attempts: number;
}

export class SunflowerDB extends Dexie {
  tasks!: Table<Task>;
  habit_templates!: Table<HabitTemplate>;
  days!: Table<Day>;
  notepad_pages!: Table<NotepadPage>;
  settings!: Table<Settings>;
  labels!: Table<Label>;
  task_labels!: Table<TaskLabel>;
  write_queue!: Table<WriteQueueItem>;

  constructor() {
    super('sunflower');
    this.version(1).stores({
      tasks:          'id, user_id, day_key, template_id, state, updated_at, [user_id+day_key], [user_id+template_id+day_key]',
      habit_templates:'id, user_id, active, [user_id+active]',
      days:           '[user_id+day_key], user_id, day_key',
      notepad_pages:  'id, user_id, archived, updated_at, [user_id+archived]',
      settings:       'user_id',
      write_queue:    '++id, table, row_id, attempted_at',
    });
    // v2 — labels system + workout habits.
    this.version(2)
      .stores({
        tasks:          'id, user_id, day_key, template_id, state, updated_at, [user_id+day_key], [user_id+template_id+day_key]',
        habit_templates:'id, user_id, active, kind, [user_id+active]',
        days:           '[user_id+day_key], user_id, day_key',
        notepad_pages:  'id, user_id, archived, updated_at, [user_id+archived]',
        settings:       'user_id',
        labels:         'id, user_id, name, [user_id+name]',
        task_labels:    'id, task_id, label_id, user_id, [task_id+label_id], [user_id+label_id]',
        write_queue:    '++id, table, row_id, attempted_at',
      })
      .upgrade(async (tx) => {
        // Backfill habit_templates.kind for rows created under v1.
        await tx.table('habit_templates').toCollection().modify((h) => {
          if (!h.kind) h.kind = 'habit';
        });
      });
    // v3 — habit_title snapshot on tasks + logged_at on days.
    this.version(3)
      .stores({
        tasks:          'id, user_id, day_key, template_id, state, updated_at, [user_id+day_key], [user_id+template_id+day_key]',
        habit_templates:'id, user_id, active, kind, [user_id+active]',
        days:           '[user_id+day_key], user_id, day_key',
        notepad_pages:  'id, user_id, archived, updated_at, [user_id+archived]',
        settings:       'user_id',
        labels:         'id, user_id, name, [user_id+name]',
        task_labels:    'id, task_id, label_id, user_id, [task_id+label_id], [user_id+label_id]',
        write_queue:    '++id, table, row_id, attempted_at',
      })
      .upgrade(async (tx) => {
        // Default the new columns. Days created under v2 had no logged_at
        // notion at all — leave them unlogged so the user explicitly opts in.
        await tx.table('days').toCollection().modify((d) => {
          if (d.logged_at === undefined) d.logged_at = null;
        });
        await tx.table('tasks').toCollection().modify((t) => {
          if (t.habit_title === undefined) t.habit_title = null;
        });
      });
  }
}

// Singleton — safe because Dexie is lazy-opened
let _db: SunflowerDB | null = null;

export function getDb(): SunflowerDB {
  if (!_db) _db = new SunflowerDB();
  return _db;
}

// Convenience alias (server components should never import this)
export const db = typeof window !== 'undefined' ? getDb() : (null as unknown as SunflowerDB);
