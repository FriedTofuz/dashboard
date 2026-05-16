import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DesktopDashboard } from '@/components/layout/DesktopDashboard';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <DesktopDashboard userId={user.id} />;
}
