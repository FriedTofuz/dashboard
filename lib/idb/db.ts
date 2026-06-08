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
  // ── Finance plan ──────────────────────────────────────────────────────
  // Stored in cents to avoid float drift on money math. `null` = not set yet.
  finance_monthly_budget_cents?: number | null;
  finance_monthly_allowance_cents?: number | null;
  finance_savings_target_cents?: number | null;
  /** YYYY-MM-DD target date for the savings goal (e.g. end of semester). */
  finance_savings_target_by?: string | null;

  // ── v2.5 card encryption ──────────────────────────────────────────────
  /** True once the user has opted in to PIN-derived card-field encryption. */
  card_encryption_enabled?: boolean;
  /** CMK wrapped by PIN-derived KEK. base64(salt|iv|ct|tag). */
  card_pin_keybox?: string | null;
  /** CMK wrapped by recovery-code-derived KEK. base64(salt|iv|ct|tag). */
  card_recovery_keybox?: string | null;
  /** Hex HMAC of the recovery code — used to validate user input
   *  before attempting the slow AES decryption. */
  card_recovery_check?: string | null;

  // ── v2.5 display knob ────────────────────────────────────────────────
  /** Desktop main column max-width cap.
   *  null = use default (1500); 0 = no cap ("Full");
   *  otherwise one of 1200 / 1500 / 1700 / 1920. */
  ui_max_width_px?: number | null;

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

  // ── v2.5 encryption ─────────────────────────────────────────────────
  /** True when `number` and `security_code` are stored encrypted in the
   *  `*_enc` siblings (and the plaintext columns are ''). */
  is_encrypted?: boolean;
  /** base64(iv|ct|tag) of the AES-GCM-encrypted `number`. */
  number_enc?: string | null;
  /** base64(iv|ct|tag) of the AES-GCM-encrypted `security_code`. */
  security_code_enc?: string | null;

  created_at: number;
  updated_at: number;
}

/** Weekly spending + income snapshot. Stored in cents so we never deal
 *  with floating-point money. `week_start` is the Monday of the week in
 *  YYYY-MM-DD form so we can index and sort lexicographically. */
export interface FinanceEntry {
  id: string;
  user_id: string;
  week_start: string;      // YYYY-MM-DD (Monday)
  spending_cents: number;  // total spend that week
  income_cents: number;    // total income that week
  note: string;
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
  finance_entries!: Table<FinanceEntry>;
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
    // v7 — Financial planner: weekly entries + finance fields on settings.
    this.version(7).stores({
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
      finance_entries:'id, user_id, week_start, updated_at, [user_id+week_start]',
      write_queue:    '++id, table, row_id, attempted_at',
    });
    // v8 — v2.5 card encryption + ui_max_width_px on settings.
    // Stores are unchanged; only column shapes grew. The Dexie schema
    // version bump still has to fire so existing IndexedDB databases
    // pick up the new (optional) columns on Card / Settings.
    this.version(8)
      .stores({
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
        finance_entries:'id, user_id, week_start, updated_at, [user_id+week_start]',
        write_queue:    '++id, table, row_id, attempted_at',
      })
      .upgrade(async (tx) => {
        // Backfill encryption defaults so existing cards explicitly read
        // as plaintext rather than `undefined` (which CardsBody treats
        // ambiguously).
        await tx.table('cards').toCollection().modify((c) => {
          if (c.is_encrypted === undefined) c.is_encrypted = false;
          if (c.number_enc === undefined) c.number_enc = null;
          if (c.security_code_enc === undefined) c.security_code_enc = null;
        });
        await tx.table('settings').toCollection().modify((s) => {
          if (s.card_encryption_enabled === undefined) s.card_encryption_enabled = false;
          if (s.ui_max_width_px === undefined) s.ui_max_width_px = null;
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
