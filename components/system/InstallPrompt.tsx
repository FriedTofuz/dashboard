'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'sunflower-install-dismissed';

/** Shows a one-time iOS install card when running in mobile Safari and not standalone. */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/(?:CriOS|FxiOS|EdgiOS)/.test(ua);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIos && !isStandalone) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 ink-box paper rounded-card p-3 z-30 col gap-1.5 shadow-lg"
      role="dialog"
    >
      <div className="row items-start justify-between">
        <span className="font-hand text-body-sm">
          add Sunflower to your home screen
        </span>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setVisible(false);
          }}
          className="tiny shrink-0 ml-2"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <p className="tiny">
        tap the share icon <span aria-hidden>⎙</span> then{' '}
        <span className="font-hand">Add to Home Screen</span>
      </p>
    </div>
  );
}
