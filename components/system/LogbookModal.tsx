'use client';

import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '@/lib/store/useUiStore';
import { toastSuccess } from '@/lib/store/useToastStore';
import { getDb } from '@/lib/idb/db';
import {
  ensureDefaultPin,
  hashPin,
  setPin,
} from '@/lib/idb/passwords';
import { PasswordsBody } from './logbook/PasswordsBody';
import { ContactsBody } from './logbook/ContactsBody';
import { CardsBody } from './logbook/CardsBody';

interface LogbookModalProps {
  userId: string;
}

type Tab = 'passwords' | 'cards' | 'contacts';

const NAV: Array<{ id: Tab; label: string }> = [
  { id: 'passwords', label: 'Passwords' },
  { id: 'cards',     label: 'Cards' },
  { id: 'contacts',  label: 'Contacts' },
];

/** Locked logbook with a Settings-style sidebar. PIN-gated; default PIN
 *  is seeded once on first open (hash of "24850"). Outside-click is
 *  intentionally disabled — the locked feel matters more than ergonomics,
 *  per spec. The × button is the only way out. */
export function LogbookModal({ userId }: LogbookModalProps) {
  const open = useUiStore((s) => s.logbookOpen);
  const close = () => useUiStore.getState().setLogbookOpen(false);
  const tab = useUiStore((s) => s.logbookTab);
  const setTab = useUiStore((s) => s.setLogbookTab);

  const [unlocked, setUnlocked] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  // Re-lock whenever the modal closes.
  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setChangingPin(false);
    }
  }, [open]);

  // Seed the default PIN on first run so the user can unlock with 24850
  // without any setup step.
  useEffect(() => {
    if (open) void ensureDefaultPin(userId);
  }, [open, userId]);

  // v2.4.1: Escape dismisses the Logbook (lock screen or unlocked). If the
  // Change-PIN sub-dialog is open, prefer to close it first so Esc unwinds
  // one layer at a time.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (changingPin) {
        setChangingPin(false);
      } else {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // close is stable (calls into the store), so we intentionally exclude it
    // from deps to avoid re-binding on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, changingPin]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)', zIndex: 80 }}
      // No backdrop close — the Logbook locks; only × dismisses.
      role="dialog"
      aria-modal="true"
      aria-labelledby="logbook-title"
    >
      <div
        className="paper wobble"
        style={{
          position: 'relative',
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          // Same dimensions as Settings (1.25× the v2.2 sizing). When
          // locked, shrink to the PIN-prompt size so the empty sidebar
          // doesn't loom over a tiny form.
          width: unlocked ? 'min(1375px, 94vw)' : 'min(420px, 92vw)',
          height: unlocked ? 'min(875px, 90vh)' : undefined,
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* Always-visible close — pinned to the popup frame's top-right so
            it's reachable in both the lock screen and the unlocked shell.
            v2.4.1: required affordance now that backdrop click is disabled. */}
        <button
          type="button"
          onClick={close}
          aria-label="Close logbook"
          title="Close (Esc)"
          className="ui hover:bg-paper-warm transition-colors"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 2,
            background: 'var(--paper)',
            border: '1.5px solid var(--ink-soft)',
            color: 'var(--ink-faint)',
            fontSize: 18,
            lineHeight: 1,
            padding: '4px 10px',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        {unlocked ? (
          <UnlockedShell
            userId={userId}
            tab={tab}
            setTab={setTab}
            onChangePin={() => setChangingPin(true)}
          />
        ) : (
          <PinLockBody
            userId={userId}
            onUnlock={() => setUnlocked(true)}
            onCancel={close}
          />
        )}
      </div>

      {changingPin && (
        <ChangePinDialog userId={userId} onClose={() => setChangingPin(false)} />
      )}
    </div>
  );
}

// ── Unlocked shell: sidebar + tab body ───────────────────────────────────

function UnlockedShell({
  userId, tab, setTab, onChangePin,
}: {
  userId: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  onChangePin: () => void;
}) {
  return (
    <>
      {/* Sidebar */}
      <aside
        className="col"
        style={{
          width: 220,
          borderRight: '1.5px solid var(--rule)',
          background: 'var(--paper-warm)',
          padding: '24px 14px',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <h2
          id="logbook-title"
          className="hand"
          style={{
            fontSize: 22,
            lineHeight: 1.1,
            fontWeight: 600,
            margin: '0 0 14px 6px',
            color: 'var(--ink)',
          }}
        >
          Logbook
        </h2>
        {NAV.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="ui transition-colors"
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 5,
                border: 'none',
                background: active ? 'var(--terra-tint)' : 'transparent',
                color: active ? 'var(--terra-deep)' : 'var(--ink)',
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                cursor: 'pointer',
              }}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={onChangePin}
          className="ui hover:bg-paper-warm transition-colors"
          style={{
            textAlign: 'left',
            padding: '6px 12px',
            borderRadius: 5,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-faint)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Change PIN
        </button>
      </aside>

      {/* Content — the popup-frame × at the top-right handles closing now. */}
      <section
        className="col"
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
        }}
      >
        {tab === 'passwords' && <PasswordsBody userId={userId} />}
        {tab === 'cards'     && <CardsBody userId={userId} />}
        {tab === 'contacts'  && <ContactsBody userId={userId} />}
      </section>
    </>
  );
}

// ── PIN lock + Change-PIN  ───────────────────────────────────────────────

function PinLockBody({
  userId,
  onUnlock,
  onCancel,
}: {
  userId: string;
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [pin, setPinDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError(null);

    const settings = await getDb().settings.get(userId);
    const storedHash = settings?.password_pin_hash ?? null;
    if (!storedHash) {
      setError('PIN not initialized yet — try again in a moment.');
      setChecking(false);
      return;
    }

    const candidateHash = await hashPin(pin);
    if (candidateHash === storedHash) {
      onUnlock();
    } else {
      setError('Wrong PIN');
      setPinDigits('');
    }
    setChecking(false);
  }

  return (
    <div className="col" style={{ padding: '28px 28px 24px', gap: 16, flex: 1 }}>
      <h2
        id="logbook-title"
        className="hand"
        style={{
          fontSize: 24,
          lineHeight: 1.1,
          fontWeight: 600,
          margin: 0,
          color: 'var(--ink)',
        }}
      >
        <span className="underline-hand">Logbook</span>
      </h2>
      <p
        className="ui"
        style={{
          fontSize: 13,
          color: 'var(--ink-faint)',
          margin: 0,
          lineHeight: 1.45,
        }}
      >
        Enter your PIN to unlock your passwords, cards, and contacts.
      </p>

      <form onSubmit={handleSubmit} className="col" style={{ gap: 10 }}>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => {
            setPinDigits(e.target.value.replace(/\D/g, ''));
            if (error) setError(null);
          }}
          aria-label="PIN"
          className="ui-b num wobble"
          style={{
            border: `1.5px solid ${error ? 'var(--terra-deep)' : 'var(--ink-soft)'}`,
            borderRadius: 6,
            padding: '12px 14px',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: 22,
            letterSpacing: '0.4em',
            textAlign: 'center',
            outline: 'none',
          }}
        />
        {error && (
          <span className="ui" style={{ fontSize: 12, color: 'var(--terra-deep)' }}>
            {error}
          </span>
        )}

        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={{
              flex: 1,
              border: '1.5px solid var(--ink-soft)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pin.length === 0 || checking}
            className="ui-b wobble transition-colors"
            style={{
              flex: 1,
              border: '1.5px solid var(--terra-deep)',
              background: 'var(--terra)',
              color: 'var(--paper)',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: pin.length === 0 || checking ? 'not-allowed' : 'pointer',
              opacity: pin.length === 0 || checking ? 0.6 : 1,
            }}
          >
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}

function ChangePinDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next.length < 4) {
      setError('New PIN must be at least 4 digits.');
      return;
    }
    if (next !== confirm) {
      setError('New PIN entries do not match.');
      return;
    }

    setSaving(true);
    const settings = await getDb().settings.get(userId);
    const storedHash = settings?.password_pin_hash ?? null;
    if (storedHash) {
      const candidateHash = await hashPin(current);
      if (candidateHash !== storedHash) {
        setError('Current PIN is wrong.');
        setSaving(false);
        return;
      }
    }
    await setPin(userId, next);
    toastSuccess('PIN updated');
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.55)', zIndex: 90 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSave}
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(380px, 92vw)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          padding: '22px 24px',
          gap: 12,
        }}
      >
        <h3
          className="hand"
          style={{
            fontSize: 20,
            lineHeight: 1.1,
            fontWeight: 600,
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          Change PIN
        </h3>
        <PinField label="Current PIN" value={current} onChange={setCurrent} />
        <PinField label="New PIN" value={next} onChange={setNext} />
        <PinField label="Confirm new PIN" value={confirm} onChange={setConfirm} />
        {error && (
          <span className="ui" style={{ fontSize: 12, color: 'var(--terra-deep)' }}>
            {error}
          </span>
        )}
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={{
              flex: 1,
              border: '1.5px solid var(--ink-soft)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="ui-b wobble"
            style={{
              flex: 1,
              border: '1.5px solid var(--sage-deep)',
              background: 'var(--sage)',
              color: 'var(--paper)',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function PinField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <span
        className="tiny"
        style={{ letterSpacing: '0.12em', color: 'var(--ink-faint)' }}
      >
        {label}
      </span>
      <input
        type="password"
        inputMode="numeric"
        maxLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="ui-b num"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 5,
          background: 'var(--paper)',
          color: 'var(--ink)',
          padding: '8px 10px',
          fontSize: 18,
          letterSpacing: '0.4em',
          textAlign: 'center',
          outline: 'none',
          width: '100%',
        }}
      />
    </div>
  );
}
