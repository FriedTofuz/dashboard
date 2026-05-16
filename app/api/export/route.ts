import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TABLES = ['habit_templates', 'tasks', 'days', 'notepad_pages', 'settings'] as const;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*').eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    out[t] = data ?? [];
  }

  const filename = `sunflower-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), data: out }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
