import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        'paper-warm': 'var(--paper-warm)',
        'paper-shadow': 'var(--paper-shadow)',
        'paper-edge': 'var(--paper-edge)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-faint': 'var(--ink-faint)',
        sage: 'var(--sage)',
        'sage-deep': 'var(--sage-deep)',
        'sage-wash': 'var(--sage-wash)',
        terra: 'var(--terracotta)',
        'terra-deep': 'var(--terracotta-deep)',
        'terra-wash': 'var(--terracotta-wash)',
        ochre: 'var(--ochre)',
        'ochre-deep': 'var(--ochre-deep)',
        'ochre-wash': 'var(--ochre-wash)',
      },
      fontFamily: {
        hand: ['var(--font-caveat)', 'cursive'],
        ui: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        // legacy alias — kept so any leftover usage still resolves to DM Sans
        print: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '5px',
        input: '3px',
        bar: '8px',
      },
      fontSize: {
        // v2 §1.2 type scale — see design/INSTRUCTIONS-V2.md
        display: ['52px', { lineHeight: '1.0', fontWeight: '700' }],
        h1: ['32px', { lineHeight: '1.1', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '1.15', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '1.2', fontWeight: '600' }],
        'task-label': ['22px', { lineHeight: '1.15', fontWeight: '600' }],
        'body-lg': ['17px', { lineHeight: '1.45', fontWeight: '500' }],
        body: ['15px', { lineHeight: '1.5', fontWeight: '500' }],
        'body-sm': ['13px', { lineHeight: '1.45', fontWeight: '500' }],
        caption: ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        tiny: ['11px', { lineHeight: '1.2', fontWeight: '500' }],
        'num-lg': ['32px', { lineHeight: '1.0', fontWeight: '600' }],
        'num-md': ['20px', { lineHeight: '1.1', fontWeight: '600' }],
        'mono-sm': ['12px', { lineHeight: '1.2', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};

export default config;
