'use client';

import { PaperCard } from '@/components/ui/PaperCard';
import { Sunflower } from './Sunflower';
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

      <div className="flex-1 flex items-end justify-center pb-4">
        <Sunflower state={state} size={220} />
      </div>

      <p className="font-hand text-body-sm muted italic text-center px-4 pb-3">
        {caption ?? captions[state]}
      </p>
    </PaperCard>
  );
}
