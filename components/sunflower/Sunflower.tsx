'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  SUNFLOWER_CONFIGS,
  buildPetals,
  buildSeeds,
  type FlowerState,
} from './sunflowerConfigs';

interface SunflowerProps {
  state: FlowerState;
  size?: number;
}

export function Sunflower({ state, size = 280 }: SunflowerProps) {
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : 0.6;

  return (
    <div
      style={{ width: size, height: (size / 200) * 300, position: 'relative' }}
      aria-label={`Sunflower — ${state}`}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={state}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <SunflowerSvg state={state} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SunflowerSvg({ state }: { state: FlowerState }) {
  const c = SUNFLOWER_CONFIGS[state] ?? SUNFLOWER_CONFIGS.healthy;
  const petals = buildPetals(c);
  const seeds = buildSeeds(c);

  return (
    <svg
      viewBox="0 0 200 300"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax meet"
      style={{ width: '100%', height: '100%' }}
    >
      <circle
        cx={c.headX}
        cy={c.headY}
        r={c.washR}
        fill={c.washFill}
        opacity={c.washOpacity}
        filter="url(#blob)"
      />

      <path
        d={c.stem}
        stroke="#5c6d52"
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
        filter="url(#wobble)"
      />

      {c.leaves.map((l, i) => (
        <g key={i} transform={`rotate(${l.rot} 100 170)`}>
          <path
            d={l.d}
            fill="#9eb094"
            stroke="#5c6d52"
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.92}
          />
          <path d={l.d} fill="none" stroke="#5c6d52" strokeWidth={0.5} opacity={0.35} />
          {l.vein && (
            <path
              d={l.vein}
              fill="none"
              stroke="#4a5a42"
              strokeWidth={0.7}
              strokeLinecap="round"
              opacity={0.55}
            />
          )}
        </g>
      ))}

      <g filter="url(#wobble)">
        {petals.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={c.petalFill}
            stroke={c.petalStroke}
            strokeWidth={p.isBack ? 0.7 : 0.95}
            strokeLinejoin="round"
            opacity={p.isBack ? 0.72 : 0.94}
            transform={`rotate(${p.rot} ${c.headX} ${c.headY})`}
          />
        ))}
      </g>

      <circle
        cx={c.headX}
        cy={c.headY}
        r={c.centerR}
        fill={c.centerFill}
        stroke="#2b1a0a"
        strokeWidth={1.1}
        filter="url(#wobble)"
      />
      {seeds.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={0.9} fill="#2b1a0a" opacity={0.8} />
      ))}

      <g transform={`rotate(${c.potTilt} 100 260)`}>
        <path
          d="M52 232 L148 232 L138 290 L62 290 Z"
          fill="#d9a991"
          opacity={0.55}
          filter="url(#blob)"
        />
        <path
          d="M52 232 L148 232 L138 290 L62 290 Z"
          fill="#e8c6b8"
          fillOpacity={0.35}
          stroke="#7a4a3a"
          strokeWidth={1.8}
          strokeLinejoin="round"
          filter="url(#wobble)"
        />
        <path
          d="M50 232 L150 232"
          stroke="#7a4a3a"
          strokeWidth={1.8}
          strokeLinecap="round"
          filter="url(#wobble)"
        />
        <ellipse cx={100} cy={232} rx={48} ry={4} fill="#3e2818" opacity={0.55} filter="url(#wobble)" />
        <path
          d="M68 248 L72 286 M88 248 L90 286 M110 248 L110 286 M130 248 L128 286"
          stroke="#7a4a3a"
          strokeWidth={0.6}
          opacity={0.35}
          fill="none"
          filter="url(#wobble)"
        />
      </g>

      {c.fallingPetals && (
        <g>
          <ellipse cx={55} cy={232} rx={4.5} ry={2} fill="#9a8a6d" stroke="#5a4a32" strokeWidth={0.7} transform="rotate(-22 55 232)" />
          <ellipse cx={138} cy={234} rx={4} ry={1.8} fill="#9a8a6d" stroke="#5a4a32" strokeWidth={0.7} transform="rotate(34 138 234)" />
          <ellipse cx={88} cy={238} rx={4.5} ry={2} fill="#a89878" stroke="#5a4a32" strokeWidth={0.7} transform="rotate(8 88 238)" />
        </g>
      )}
    </svg>
  );
}
