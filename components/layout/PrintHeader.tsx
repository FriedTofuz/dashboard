'use client';

import { useEffect, useState } from 'react';
import { formatDayLabel, todayKey } from '@/lib/time/dayKey';

/** Visible only when printing. Shows date and a tiny app banner. */
export function PrintHeader() {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const k = todayKey();
    const { weekday, monthDay } = formatDayLabel(k);
    setLabel(`${weekday} · ${monthDay}`);
  }, []);

  return (
    <div
      className="print-only"
      style={{
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        borderBottom: '1px solid #000',
        paddingBottom: 8,
        marginBottom: 16,
      }}
    >
      Sunflower · Daily log · <span>{label}</span>
    </div>
  );
}
