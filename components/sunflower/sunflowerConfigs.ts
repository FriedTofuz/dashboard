export type FlowerState = 'thriving' | 'healthy' | 'drooping' | 'wilting';

interface Leaf {
  d: string;
  rot: number;
  vein: string;
}

export interface SunflowerConfig {
  headX: number;
  headY: number;
  headAngle?: number;
  petals: number;
  petalLen: number;
  petalW: number;
  petalFill: string;
  petalStroke: string;
  washR: number;
  washFill: string;
  washOpacity: number;
  centerR: number;
  centerFill: string;
  stem: string;
  leaves: Leaf[];
  potTilt: number;
  seedDots: boolean;
  fallingPetals?: boolean;
}

export const SUNFLOWER_CONFIGS: Record<FlowerState, SunflowerConfig> = {
  thriving: {
    headX: 100, headY: 70,
    petals: 14, petalLen: 26, petalW: 6.5,
    petalFill: '#E2A934', petalStroke: '#5C3E1A',
    washR: 44, washFill: '#E8B863', washOpacity: 0.55,
    centerR: 12, centerFill: '#5C3E1A',
    stem: 'M100 230 Q 98 170 100 95',
    leaves: [
      { d: 'M100 170 q -32 -6 -42 -26 q 28 -2 42 18', rot: -2,
        vein: 'M100 170 q -22 -8 -38 -24 M86 168 q -4 -10 -10 -16 M82 174 q -10 -4 -16 -10' },
      { d: 'M100 140 q 30 -8 42 -28 q -26 -4 -42 16',  rot: 2,
        vein: 'M100 140 q 22 -8 38 -26 M114 138 q 4 -10 10 -16 M118 144 q 10 -4 16 -10' },
    ],
    potTilt: 0, seedDots: true,
  },
  healthy: {
    headX: 100, headY: 80,
    petals: 12, petalLen: 22, petalW: 6,
    petalFill: '#C2912E', petalStroke: '#5C3E1A',
    washR: 38, washFill: '#E8B863', washOpacity: 0.5,
    centerR: 11, centerFill: '#5C3E1A',
    stem: 'M100 230 Q 102 175 100 105',
    leaves: [
      { d: 'M100 175 q -28 -4 -38 -22 q 24 -2 38 14', rot: -1,
        vein: 'M100 175 q -20 -6 -34 -20' },
      { d: 'M100 145 q 26 -6 36 -22 q -22 -4 -36 12',  rot: 1,
        vein: 'M100 145 q 20 -6 32 -20' },
    ],
    potTilt: 0, seedDots: true,
  },
  drooping: {
    headX: 118, headY: 115, headAngle: 35,
    petals: 10, petalLen: 18, petalW: 5.5,
    petalFill: '#B39265', petalStroke: '#5C3E1A',
    washR: 32, washFill: '#D9BB86', washOpacity: 0.45,
    centerR: 10, centerFill: '#5C3E1A',
    stem: 'M100 230 Q 100 185 110 155 Q 118 132 118 122',
    leaves: [
      { d: 'M101 188 q -26 4 -38 -10 q 22 -10 38 -2', rot: 4,
        vein: 'M101 188 q -18 0 -32 -8' },
      { d: 'M102 158 q 22 -4 32 -20 q -18 -2 -32 8',  rot: 6,
        vein: 'M102 158 q 16 -4 28 -16' },
    ],
    potTilt: 0, seedDots: false,
  },
  wilting: {
    headX: 78, headY: 178, headAngle: 110,
    petals: 8, petalLen: 14, petalW: 5,
    petalFill: '#9A8A6D', petalStroke: '#5A4A32',
    washR: 24, washFill: '#BFAE87', washOpacity: 0.4,
    centerR: 8.5, centerFill: '#4A3320',
    stem: 'M100 230 Q 96 200 88 188 Q 82 184 78 185',
    leaves: [
      { d: 'M99 200 q -24 12 -38 4 q 18 -16 38 -8', rot: 14,
        vein: 'M99 200 q -16 8 -30 4' },
      { d: 'M100 178 q 20 8 32 -2 q -16 -10 -32 -2', rot: 18,
        vein: 'M100 178 q 14 6 26 0' },
    ],
    potTilt: -2, seedDots: false, fallingPetals: true,
  },
};

function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export interface PetalPath {
  d: string;
  rot: number;
  isBack: boolean;
}

export function buildPetals(c: SunflowerConfig): PetalPath[] {
  const out: PetalPath[] = [];
  for (let layer = 0; layer < 2; layer++) {
    const isBack = layer === 0;
    const count = c.petals;
    const offset = isBack ? (360 / count) / 2 : 0;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 360 + (c.headAngle ?? 0) + offset;
      const jitter = (rand(i + 1 + layer * 31) - 0.5) * 5;
      const lenJ = (c.petalLen + (rand(i + 7 + layer * 13) - 0.5) * 3) * (isBack ? 0.86 : 1);
      const widthJ = c.petalW + (rand(i + 19 + layer) - 0.5) * 0.8;
      const cx = c.headX;
      const cy = c.headY;
      const tx = cx;
      const ty = cy - lenJ;
      const d = `M ${cx} ${cy} C ${cx - widthJ * 0.9} ${cy - lenJ * 0.25}, ${cx - widthJ * 0.7} ${cy - lenJ * 0.75}, ${tx} ${ty} C ${cx + widthJ * 0.7} ${cy - lenJ * 0.75}, ${cx + widthJ * 0.9} ${cy - lenJ * 0.25}, ${cx} ${cy} Z`;
      out.push({ d, rot: a + jitter, isBack });
    }
  }
  return out;
}

export interface SeedDot { cx: number; cy: number; }

export function buildSeeds(c: SunflowerConfig): SeedDot[] {
  if (!c.seedDots) return [];
  const dots: SeedDot[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = rand(i + 11) * Math.PI * 2;
    const r = rand(i + 23) * (c.centerR - 3);
    dots.push({
      cx: c.headX + Math.cos(angle) * r,
      cy: c.headY + Math.sin(angle) * r,
    });
  }
  return dots;
}
