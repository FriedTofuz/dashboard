import type { Metadata, Viewport } from 'next';
import { Caveat, Kalam } from 'next/font/google';
import './globals.css';
import { WobbleDefs } from '@/components/ui/WobbleDefs';
import { PwaRegistrar } from '@/components/system/PwaRegistrar';

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

const kalam = Kalam({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-kalam',
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
  themeColor: '#F5EFE6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caveat.variable} ${kalam.variable}`}>
      <body className="font-hand bg-paper text-ink min-h-screen">
        <WobbleDefs />
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
