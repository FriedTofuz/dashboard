'use client';

import { useEffect } from 'react';
import { bootstrapTheme } from '@/lib/store/useThemeStore';
import { bootstrapAccent } from '@/lib/store/useAccentStore';

/** Runs once on the client to apply the saved theme + accent (or system pref) and listen for OS changes. */
export function ThemeBoot() {
  useEffect(() => {
    bootstrapTheme();
    bootstrapAccent();
  }, []);
  return null;
}
