import Dexie, { type Table } from 'dexie';

export type TaskState = 'open' | 'running' | 'paused' | 'done';
export type Recurrence = 'daily' | 'weekday' | 'weekly' | 'custom';

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
  created_at: number;
}

export interface Day {
  user_id: string;
  day_key: string;                   // compound PK
  notes: string;
  flower_state: 'thriving' | 'healthy' | 'drooping' | 'wilting';
  deficit_seconds: number;           // end-of-day snapshot
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
  write_queue!: Table<WriteQueueItem>;

  constructor() {
    super('sunflower');
    this.version(1).stores({
      tasks:          'id, user_id, day_key, template_id, state, updated_at',
      habit_templates:'id, user_id, active',
      days:           '[user_id+day_key], user_id, day_key',
      notepad_pages:  'id, user_id, archived, updated_at',
      settings:       'user_id',
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
