export function todayKey(): string {
  return toDayKey(new Date());
}

export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const date = fromDayKey(key);
  date.setDate(date.getDate() + n);
  return toDayKey(date);
}

export function formatDayLabel(key: string): { weekday: string; monthDay: string } {
  const date = fromDayKey(key);
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
    monthDay: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
  };
}

export function isHabitScheduledFor(
  recurrence: 'daily' | 'weekday' | 'weekly' | 'custom',
  recurrenceDays: number[] | null,
  dayKey: string,
): boolean {
  const date = fromDayKey(dayKey);
  const dow = date.getDay(); // 0=Sun, 6=Sat
  switch (recurrence) {
    case 'daily':   return true;
    case 'weekday': return dow >= 1 && dow <= 5;
    case 'weekly':
    case 'custom':  return recurrenceDays?.includes(dow) ?? false;
  }
}

export function elapsedLabel(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
