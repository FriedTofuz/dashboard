'use client';

import { useEffect, useState } from 'react';
import { DesktopDashboard } from './DesktopDashboard';
import { MobileDashboard } from './MobileDashboard';

interface Props {
  userId: string;
}

/** Render desktop or mobile based on viewport. Renders nothing on first paint
 *  to avoid mismatched-hydration flicker between server (no window) and client. */
export function DashboardShell({ userId }: Props) {
  const [size, setSize] = useState<'desktop' | 'mobile' | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setSize(mq.matches ? 'mobile' : 'desktop');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (size === null) {
    return <div className="min-h-screen paper" aria-busy="true" />;
  }
  return size === 'mobile' ? (
    <MobileDashboard userId={userId} />
  ) : (
    <DesktopDashboard userId={userId} />
  );
}
