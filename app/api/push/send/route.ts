import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Vercel cron pings this hourly. Sends a "rule of 3" reminder if today's R3
// is incomplete and it's not too late in the day.
export async function GET(request: Request) {
  // Cron auth: Vercel adds Authorization: Bearer ${CRON_SECRET}
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com';

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ skipped: 'vapid keys missing' });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ skipped: 'service role missing' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: subs, error } = await supabase
    .from('settings')
    .select('user_id, push_subscription')
    .not('push_subscription', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let removed = 0;

  for (const row of subs ?? []) {
    const sub = row.push_subscription as webpush.PushSubscription;
    if (!sub?.endpoint) continue;
    try {
      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: '✿ Sunflower',
          body: 'water me — what are today\'s three?',
          url: '/',
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag: 'sunflower-daily',
        }),
      );
      sent++;
    } catch (err) {
      const e = err as { statusCode?: number };
      if (e.statusCode === 410 || e.statusCode === 404) {
        await supabase
          .from('settings')
          .update({ push_subscription: null })
          .eq('user_id', row.user_id);
        removed++;
      } else {
        console.warn('[push] send failed', err);
      }
    }
  }

  return NextResponse.json({ sent, removed });
}
