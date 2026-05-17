'use client';

import { useEffect } from 'react';
import { bootstrapTheme } from '@/lib/store/useThemeStore';

/** Runs once on the client to apply the saved theme (or system pref) and listen for OS changes. */
export function ThemeBoot() {
  useEffect(() => {
    bootstrapTheme();
  }, []);
  return null;
}
