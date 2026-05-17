import type { Metadata, Viewport } from 'next';
import { Caveat, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WobbleDefs } from '@/components/ui/WobbleDefs';
import { PwaRegistrar } from '@/components/system/PwaRegistrar';
import { ThemeBoot } from '@/components/system/ThemeBoot';

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-caveat',
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
      className={`${caveat.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-paper text-ink min-h-screen">
        <ThemeBoot />
        <WobbleDefs />
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
