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
  /** True when this is a "rest day" — set by the Away status. Rest days
   *  render in the streak strip with the secondary accent (ochre / gold)
   *  and are skipped by the streak count. */
  away?: boolean;
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
  /** sha256 hex of the user's password-manager PIN. Default seeded to
   *  hash("24850") on first run. The PIN is purely a UI gate — entries
   *  are stored in plaintext at rest in both Dexie and Supabase. */
  password_pin_hash?: string | null;
  updated_at: number;
}

export interface Password {
  id: string;
  user_id: string;
  name: string;
  username: string;
  password: string;
  /** Free-form list of URLs / app references — newline or comma separated. */
  sites: string;
  note: string;
  created_at: number;
  updated_at: number;
}

export interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  email: string;
  pronouns: string;
  address: string;
  /** Free-form (MM/DD or YYYY-MM-DD or "October 4") — easier than picking a strict format. */
  birthday: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

export type CardKind = 'payment' | 'insurance' | 'membership' | 'other';

export interface Card {
  id: string;
  user_id: string;
  /** Display label e.g. "Chase Sapphire" or "Aetna PPO". */
  name: string;
  kind: CardKind;
  cardholder: string;
  /** Free-form: card number, member ID, account #. */
  number: string;
  /** "MM/YY" for payment cards; expiration / renewal date for others. */
  expires: string;
  /** CVV for payment cards; group # / plan code for insurance. */
  security_code: string;
  /** Bank / insurer / club. */
  issuer: string;
  notes: string;
  created_at: number;
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
  passwords!: Table<Password>;
  contacts!: Table<Contact>;
  cards!: Table<Card>;
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
    // v4 — passwords manager + PIN hash on settings.
    this.version(4).stores({
      tasks:          'id, user_id, day_key, template_id, state, updated_at, [user_id+day_key], [user_id+template_id+day_key]',
      habit_templates:'id, user_id, active, kind, [user_id+active]',
      days:           '[user_id+day_key], user_id, day_key',
      notepad_pages:  'id, user_id, archived, updated_at, [user_id+archived]',
      settings:       'user_id',
      labels:         'id, user_id, name, [user_id+name]',
      task_labels:    'id, task_id, label_id, user_id, [task_id+label_id], [user_id+label_id]',
      passwords:      'id, user_id, name, updated_at, [user_id+name]',
      write_queue:    '++id, table, row_id, attempted_at',
    });
    // v5 — day.away rest-day flag (set by the Away status).
    this.version(5)
      .stores({
        tasks:          'id, user_id, day_key, template_id, state, updated_at, [user_id+day_key], [user_id+template_id+day_key]',
        habit_templates:'id, user_id, active, kind, [user_id+active]',
        days:           '[user_id+day_key], user_id, day_key',
        notepad_pages:  'id, user_id, archived, updated_at, [user_id+archived]',
        settings:       'user_id',
        labels:         'id, user_id, name, [user_id+name]',
        task_labels:    'id, task_id, label_id, user_id, [task_id+label_id], [user_id+label_id]',
        passwords:      'id, user_id, name, updated_at, [user_id+name]',
        write_queue:    '++id, table, row_id, attempted_at',
      })
      .upgrade(async (tx) => {
        await tx.table('days').toCollection().modify((d) => {
          if (d.away === undefined) d.away = false;
        });
      });
    // v6 — Logbook: contacts + cards tables.
    this.version(6).stores({
      tasks:          'id, user_id, day_key, template_id, state, updated_at, [user_id+day_key], [user_id+template_id+day_key]',
      habit_templates:'id, user_id, active, kind, [user_id+active]',
      days:           '[user_id+day_key], user_id, day_key',
      notepad_pages:  'id, user_id, archived, updated_at, [user_id+archived]',
      settings:       'user_id',
      labels:         'id, user_id, name, [user_id+name]',
      task_labels:    'id, task_id, label_id, user_id, [task_id+label_id], [user_id+label_id]',
      passwords:      'id, user_id, name, updated_at, [user_id+name]',
      contacts:       'id, user_id, last_name, first_name, updated_at',
      cards:          'id, user_id, name, kind, updated_at, [user_id+kind]',
      write_queue:    '++id, table, row_id, attempted_at',
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
