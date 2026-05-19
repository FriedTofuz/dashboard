'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CalendarFrameProps {
  userEmail: string;
}

/** Full-height popup-style page that iframes Google Calendar's embed view.
 *
 * Embed limitations:
 *  - `calendar.google.com/calendar/embed?src=…` only renders the calendar
 *    when it has been shared publicly in Google Calendar settings.
 *    Settings → "Settings for this calendar" → "Access permissions" →
 *    enable "Make available to public".
 *  - For private calendars the iframe will show Google's "this calendar
 *    isn't visible" stub. The "Open in Google Calendar" fallback below
 *    opens the authenticated full app in a new tab.
 */
export function CalendarFrame({ userEmail }: CalendarFrameProps) {
  // Browser-detected timezone, falls back to UTC at SSR.
  const tz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC';

  const src = userEmail
    ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
        userEmail,
      )}&ctz=${encodeURIComponent(tz)}&mode=WEEK&wkst=2&showTitle=0&showPrint=0&showCalendars=0`
    : null;

  const [iframeOk, setIframeOk] = useState(true);

  return (
    <div
      className="col"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--paper)',
        zIndex: 40,
      }}
    >
      {/* Header bar */}
      <div
        className="row items-center justify-between paper"
        style={{
          borderBottom: '1.5px solid var(--ink-soft)',
          padding: '12px 20px',
          gap: 12,
        }}
      >
        <div className="row items-center" style={{ gap: 12 }}>
          <Link
            href="/"
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={{
              border: '1.5px solid var(--ink-soft)',
              borderRadius: 6,
              padding: '6px 12px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            ← back
          </Link>
          <h1
            className="hand"
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1,
            }}
          >
            <span className="underline-hand">calendar</span>
          </h1>
        </div>
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ui hover:bg-paper-warm transition-colors"
          style={{
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            padding: '6px 12px',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          open in google calendar ↗
        </a>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {src && iframeOk ? (
          <iframe
            key={src}
            src={src}
            title="Google Calendar"
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              display: 'block',
              background: '#fff',
            }}
            onError={() => setIframeOk(false)}
          />
        ) : (
          <Fallback userEmail={userEmail} />
        )}

        {/* Help footer — visible underneath the iframe if it shows the
            "not visible" stub. */}
        <div
          className="row items-center justify-center"
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            pointerEvents: 'none',
          }}
        >
          <div
            className="paper wobble ui muted"
            style={{
              pointerEvents: 'auto',
              border: '1.5px dashed var(--ink-faint)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 11,
              letterSpacing: '0.04em',
              background: 'var(--paper)',
              opacity: 0.88,
            }}
          >
            embed not loading? make this calendar public in google calendar
            settings, or use the &ldquo;open in google calendar&rdquo; button.
          </div>
        </div>
      </div>
    </div>
  );
}

function Fallback({ userEmail }: { userEmail: string }) {
  return (
    <div
      className="col items-center justify-center"
      style={{ height: '100%', gap: 16, padding: 24, textAlign: 'center' }}
    >
      <p
        className="hand"
        style={{ fontSize: 22, color: 'var(--ink-soft)', margin: 0 }}
      >
        couldn&rsquo;t embed your calendar.
      </p>
      <p className="ui muted" style={{ fontSize: 13, margin: 0, maxWidth: 480 }}>
        Google blocks the authenticated calendar inside iframes. Open your real
        calendar in a new tab below, or share your calendar publicly to render
        a read-only view here.
      </p>
      <a
        href="https://calendar.google.com"
        target="_blank"
        rel="noopener noreferrer"
        className="ui-b wobble hover:bg-paper-warm transition-colors"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 6,
          padding: '10px 16px',
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        open google calendar ({userEmail || 'sign in'})
      </a>
    </div>
  );
}
