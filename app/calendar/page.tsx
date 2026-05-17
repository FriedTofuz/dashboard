import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarFrame } from '@/components/calendar/CalendarFrame';

export default async function CalendarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <CalendarFrame userEmail={user.email ?? ''} />;
}
