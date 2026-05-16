'use client';

import { PaperCard } from '@/components/ui/PaperCard';
import type { FlowerState } from '@/lib/compute/flowerState';

interface FlowerCardProps {
  state: FlowerState;
  dayNumber?: number;
  caption?: string;
}

const captions: Record<FlowerState, string> = {
  thriving: 'looking radiant today',
  healthy:  'on pace — keep it up',
  drooping: 'finish 1 more priority and i\'ll perk back up',
  wilting:  'it\'s been a while — even one task helps',
};

export function FlowerCard({ state, dayNumber, caption }: FlowerCardProps) {
  return (
    <PaperCard variant="soft" dotGrid className="col justify-between" style={{ height: 380 }}>
      <div className="row items-center justify-between px-4 pt-3">
        <span className="font-hand text-body-sm soft">your sunflower</span>
        {dayNumber != null && (
          <span className="tiny">day {dayNumber} · {state}</span>
        )}
      </div>

      {/* Sunflower SVG placeholder — replaced in Week 3 with the real component */}
      <div className="flex-1 flex items-end justify-center pb-4">
        <FlowerPlaceholder state={state} />
      </div>

      <p className="font-hand text-body-sm muted italic text-center px-4 pb-3">
        {caption ?? captions[state]}
      </p>
    </PaperCard>
  );
}

function FlowerPlaceholder({ state }: { state: FlowerState }) {
  const stems: Record<FlowerState, number> = {
    thriving: 0,
    healthy:  0,
    drooping: 35,
    wilting:  110,
  };
  const tilt = stems[state];
  const colors: Record<FlowerState, string> = {
    thriving: '#d9a857',
    healthy:  '#caa05b',
    drooping: '#b39265',
    wilting:  '#9a8a6d',
  };
  const petalCount: Record<FlowerState, number> = {
    thriving: 14,
    healthy:  12,
    drooping: 10,
    wilting:  8,
  };
  const n = petalCount[state];
  const color = colors[state];

  return (
    <svg viewBox="0 0 200 300" width="160" height="240" className="sunflower-svg" aria-label={`Sunflower — ${state}`}>
      {/* Watercolor wash (blob filter behind head) */}
      <circle cx="100" cy="90" r="48" fill={color} opacity="0.4" filter="url(#blob)" />

      {/* Petals */}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 360;
        const jitter = (((i * 7) % 5) - 2) * 0.5;
        return (
          <ellipse
            key={i}
            cx="100" cy="52"
            rx="9" ry="22"
            fill={color}
            opacity="0.88"
            stroke="#8B6914"
            strokeWidth="0.7"
            transform={`rotate(${angle + jitter}, 100, 90)`}
            filter="url(#wobble)"
          />
        );
      })}

      {/* Head center */}
      <circle cx="100" cy="90" r="18" fill="#3d2b1a" filter="url(#wobble)" />
      <circle cx="100" cy="90" r="18" fill="none" stroke="#2B2622" strokeWidth="1.2" filter="url(#wobble)" />

      {/* Stem */}
      <line
        x1="100" y1={90 + 18}
        x2={100 + Math.sin((tilt * Math.PI) / 180) * 80}
        y2={200}
        stroke="#6c7d65"
        strokeWidth="3"
        filter="url(#wobble)"
        transform={tilt > 0 ? `rotate(${tilt * 0.3}, 100, 108)` : undefined}
      />

      {/* Pot */}
      <rect x="68" y="220" width="64" height="44" rx="3" fill="#c08775" opacity="0.25" filter="url(#blob)" />
      <path d="M72 220 L68 264 L132 264 L128 220 Z" fill="none" stroke="#2B2622" strokeWidth="1.5" filter="url(#wobble)" />
      <line x1="68" y1="228" x2="132" y2="228" stroke="#2B2622" strokeWidth="1.2" filter="url(#wobble)" />
      <ellipse cx="100" cy="218" rx="28" ry="5" fill="#4a423b" opacity="0.4" filter="url(#wobble)" />
    </svg>
  );
}
