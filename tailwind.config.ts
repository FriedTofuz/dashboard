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
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-faint': 'var(--ink-faint)',
        sage: 'var(--sage)',
        'sage-deep': 'var(--sage-deep)',
        'sage-wash': 'var(--sage-wash)',
        terra: 'var(--terracotta)',
        'terra-deep': 'var(--terracotta-deep)',
        'terra-wash': 'var(--terracotta-wash)',
      },
      fontFamily: {
        hand: ['var(--font-caveat)', 'cursive'],
        print: ['var(--font-kalam)', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '4px',
        input: '3px',
        bar: '8px',
      },
      fontSize: {
        display: ['44px', { lineHeight: '1.0', fontWeight: '700' }],
        h1: ['36px', { lineHeight: '1.0', fontWeight: '700' }],
        h2: ['30px', { lineHeight: '1.0', fontWeight: '700' }],
        h3: ['22px', { lineHeight: '1.1', fontWeight: '700' }],
        'body-lg': ['22px', { lineHeight: '1.2', fontWeight: '500' }],
        body: ['20px', { lineHeight: '1.25', fontWeight: '500' }],
        'body-sm': ['18px', { lineHeight: '1.25', fontWeight: '500' }],
        caption: ['16px', { lineHeight: '1.2', fontWeight: '500' }],
        tiny: ['11px', { lineHeight: '1.0' }],
      },
    },
  },
  plugins: [],
};

export default config;
