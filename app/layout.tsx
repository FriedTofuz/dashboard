import type { Metadata, Viewport } from 'next';
import { Shantell_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WobbleDefs } from '@/components/ui/WobbleDefs';
import { PwaRegistrar } from '@/components/system/PwaRegistrar';
import { ThemeBoot } from '@/components/system/ThemeBoot';
import { ToastHost } from '@/components/system/ToastHost';

// Shantell Sans replaces Caveat for the "user voice" / handwritten role.
// Multi-weight variable font (300–800) — we use 400/500/600/700.
const handwriting = Shantell_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hand',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sunflower',
  description: 'Personal productivity dashboard',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sunflower',
  },
};

export const viewport: Viewport = {
  themeColor: '#F2EADA',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${handwriting.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-paper text-ink min-h-screen">
        <ThemeBoot />
        <WobbleDefs />
        <PwaRegistrar />
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
