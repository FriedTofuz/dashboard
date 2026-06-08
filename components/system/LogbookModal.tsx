'use client';

import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '@/lib/store/useUiStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { getDb } from '@/lib/idb/db';
import {
  ensureDefaultPin,
  hashPin,
  setPin,
} from '@/lib/idb/passwords';
import {
  enableCardEncryption,
  recoverCardEncryptionWithRecoveryCode,
  unlockCardEncryptionWithPin,
} from '@/lib/idb/settings';
import { clearSessionCmk } from '@/lib/crypto/session';
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
  /** v2.5: when set, the recovery-code-and-acknowledgement modal is open. */
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  /** v2.5: when set, the "Encrypt your cards?" opt-in modal is open. The
   *  callback receives the user's decision and finalises the unlock. */
  const [optInPin, setOptInPin] = useState<string | null>(null);
  /** v2.5: when true, the recovery-code reset dialog is open. */
  const [recovering, setRecovering] = useState(false);

  // Re-lock whenever the modal closes. Also wipe any session CMK so a
  // fresh open re-derives the key from the PIN.
  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setChangingPin(false);
      setOptInPin(null);
      setRecoveryCode(null);
      setRecovering(false);
      clearSessionCmk();
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
        {/* v2.4.0: top-right × removed — close button now lives in the
            sidebar below "Change PIN" so the popup frame stays clean. */}
        {unlocked ? (
          <UnlockedShell
            userId={userId}
            tab={tab}
            setTab={setTab}
            onClose={close}
            onChangePin={() => setChangingPin(true)}
          />
        ) : (
          <PinLockBody
            userId={userId}
            onUnlock={async (pin) => {
              const s = await getDb().settings.get(userId);
              if (s?.card_encryption_enabled) {
                const ok = await unlockCardEncryptionWithPin(userId, pin);
                if (!ok) toast('cards locked — use recovery code');
                setUnlocked(true);
              } else {
                // v2.5: nudge user to enable encryption on first unlock,
                // unless they've previously dismissed.
                const dismissed = typeof window !== 'undefined'
                  ? window.localStorage.getItem(`sunflower:cardEncOptIn:${userId}`) === 'dismissed'
                  : true;
                if (dismissed) {
                  setUnlocked(true);
                } else {
                  setOptInPin(pin);
                }
              }
            }}
            onForgotPin={() => setRecovering(true)}
            onCancel={close}
          />
        )}
      </div>

      {changingPin && (
        <ChangePinDialog userId={userId} onClose={() => setChangingPin(false)} />
      )}
      {optInPin && (
        <EncryptionOptInDialog
          onSkip={() => {
            setOptInPin(null);
            setUnlocked(true);
          }}
          onNever={() => {
            try { window.localStorage.setItem(`sunflower:cardEncOptIn:${userId}`, 'dismissed'); }
            catch { /* ignore */ }
            setOptInPin(null);
            setUnlocked(true);
          }}
          onEnable={async () => {
            try {
              const { recoveryCode: code, migratedCount } = await enableCardEncryption(userId, optInPin);
              setOptInPin(null);
              setRecoveryCode(code);
              if (migratedCount > 0) toastSuccess(`encrypted ${migratedCount} card${migratedCount === 1 ? '' : 's'}`);
            } catch (err) {
              console.error('[encrypt] enable failed', err);
              toast('could not enable encryption');
              setOptInPin(null);
              setUnlocked(true);
            }
          }}
        />
      )}
      {recoveryCode && (
        <RecoveryCodeRevealDialog
          code={recoveryCode}
          onAcknowledge={() => {
            setRecoveryCode(null);
            setUnlocked(true);
          }}
        />
      )}
      {recovering && (
        <RecoveryUnlockDialog
          userId={userId}
          onCancel={() => setRecovering(false)}
          onSuccess={() => {
            setRecovering(false);
            setUnlocked(true);
            toastSuccess('cards recovered — set new PIN above');
          }}
        />
      )}
    </div>
  );
}

// ── Unlocked shell: sidebar + tab body ───────────────────────────────────

function UnlockedShell({
  userId, tab, setTab, onClose, onChangePin,
}: {
  userId: string;
  tab: Tab;
  setTab: (t: Tab) => void;
  onClose: () => void;
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

        {/* v2.4.0: close button sits directly below Change PIN as per spec. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close logbook"
          title="Close (Esc)"
          className="ui-b wobble hover:bg-paper-warm transition-colors"
          style={{
            marginTop: 4,
            textAlign: 'center',
            padding: '8px 12px',
            borderRadius: 5,
            border: '1.5px solid var(--ink-soft)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Close
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
  onForgotPin,
  onCancel,
}: {
  userId: string;
  onUnlock: (pin: string) => void;
  onForgotPin: () => void;
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
      onUnlock(pin);
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

      <form onSubmit={handleSubmit} className="col" style={{ gap: 10 }} autoComplete="off">
        <input
          ref={inputRef}
          // v2.4.0: type="text" + .pin-masked CSS so password managers
          // don't offer to save the PIN every open. autoComplete
          // "one-time-code" is the strongest "transient code, do not
          // store" hint we can give the browser.
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          name="logbook-pin"
          maxLength={8}
          value={pin}
          onChange={(e) => {
            setPinDigits(e.target.value.replace(/\D/g, ''));
            if (error) setError(null);
          }}
          aria-label="PIN"
          className="ui-b num wobble pin-masked"
          style={{
            border: `1.5px solid ${error ? 'var(--terra-deep)' : 'var(--ink-soft)'}`,
            borderRadius: 6,
            padding: '12px 14px',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: 22,
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
        <button
          type="button"
          onClick={onForgotPin}
          className="ui"
          style={{
            alignSelf: 'flex-end',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-faint)',
            fontSize: 11,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '2px 0',
          }}
        >
          Forgot PIN?
        </button>
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
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        name="logbook-pin-change"
        maxLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="ui-b num pin-masked"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 5,
          background: 'var(--paper)',
          color: 'var(--ink)',
          padding: '8px 10px',
          fontSize: 18,
          textAlign: 'center',
          outline: 'none',
          width: '100%',
        }}
      />
    </div>
  );
}

// ── v2.5: Encryption opt-in + recovery code reveal + recovery unlock ─────

function EncryptionOptInDialog({
  onEnable, onSkip, onNever,
}: {
  onEnable: () => void;
  onSkip: () => void;
  onNever: () => void;
}) {
  const [working, setWorking] = useState(false);
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.55)', zIndex: 90 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(480px, 92vw)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          padding: '22px 24px',
          gap: 14,
        }}
      >
        <h3 className="hand" style={{ fontSize: 20, lineHeight: 1.1, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
          Encrypt your card numbers?
        </h3>
        <p className="ui" style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
          Card numbers and security codes get encrypted with a key derived from your PIN.
          Even a Supabase backup leak wouldn&apos;t expose them in plaintext.
        </p>
        <p className="ui" style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
          You&apos;ll get a one-time recovery code right after. <strong>Save it somewhere safe</strong> —
          without it, a forgotten PIN means lost card data.
        </p>
        <p className="ui" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0, lineHeight: 1.5 }}>
          Existing card rows get re-encrypted in this device&apos;s background.
          Other fields (cardholder name, issuer, notes) stay as plain text.
        </p>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onNever}
            className="ui hover:bg-paper-warm transition-colors"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-faint)',
              padding: '8px 6px',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Never ask
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onSkip}
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={{
              border: '1.5px solid var(--ink-soft)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
          <button
            type="button"
            disabled={working}
            onClick={() => {
              setWorking(true);
              onEnable();
            }}
            className="ui-b wobble"
            style={{
              border: '1.5px solid var(--sage-deep)',
              background: 'var(--sage)',
              color: 'var(--paper)',
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: working ? 'not-allowed' : 'pointer',
              opacity: working ? 0.6 : 1,
            }}
          >
            {working ? 'Encrypting…' : 'Encrypt now'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecoveryCodeRevealDialog({
  code, onAcknowledge,
}: {
  code: string;
  onAcknowledge: () => void;
}) {
  const [acked, setAcked] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* ignore */ });
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.65)', zIndex: 95 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(520px, 94vw)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          padding: '24px 26px',
          gap: 14,
        }}
      >
        <h3 className="hand" style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
          Your recovery code
        </h3>
        <p className="ui" style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
          Save this code somewhere outside the app (a password manager, a printed
          sheet). It&apos;s the only way to recover your card data if you forget
          your PIN — Sunflower has no way to recover it for you.
        </p>
        <code
          className="mono num"
          style={{
            display: 'block',
            background: 'var(--paper-warm)',
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            padding: '14px 16px',
            fontSize: 18,
            letterSpacing: '0.12em',
            textAlign: 'center',
            color: 'var(--ink)',
            wordBreak: 'break-all',
          }}
        >
          {code}
        </code>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={copyCode}
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={{
              flex: 1,
              border: '1.5px solid var(--ink-soft)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copied' : 'Copy to clipboard'}
          </button>
        </div>
        <label className="ui row items-center" style={{ gap: 8, fontSize: 12, color: 'var(--ink-soft)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={acked}
            onChange={(e) => setAcked(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          I&apos;ve saved this code somewhere safe. I understand losing it means losing my card numbers.
        </label>
        <button
          type="button"
          disabled={!acked}
          onClick={onAcknowledge}
          className="ui-b wobble"
          style={{
            border: '1.5px solid var(--terra-deep)',
            background: 'var(--terra)',
            color: 'var(--paper)',
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 13,
            cursor: acked ? 'pointer' : 'not-allowed',
            opacity: acked ? 1 : 0.55,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function RecoveryUnlockDialog({
  userId, onCancel, onSuccess,
}: {
  userId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPin.length < 4) { setError('New PIN must be at least 4 digits.'); return; }
    if (newPin !== confirmPin) { setError('PIN entries do not match.'); return; }
    setBusy(true);
    const ok = await recoverCardEncryptionWithRecoveryCode(userId, code, newPin);
    setBusy(false);
    if (!ok) {
      setError('Recovery code is wrong, or no encryption has been set up.');
      return;
    }
    onSuccess();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.55)', zIndex: 92 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(460px, 92vw)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          padding: '22px 24px',
          gap: 12,
        }}
      >
        <h3 className="hand" style={{ fontSize: 20, lineHeight: 1.1, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
          Recover with code
        </h3>
        <p className="ui" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0, lineHeight: 1.5 }}>
          Paste the recovery code you saved when you turned on encryption, then choose a new PIN.
        </p>

        <div className="col" style={{ gap: 4 }}>
          <span className="tiny" style={{ letterSpacing: '0.12em', color: 'var(--ink-faint)' }}>Recovery code</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mono"
            style={{
              border: '1.5px solid var(--ink-soft)',
              borderRadius: 5,
              background: 'var(--paper)',
              color: 'var(--ink)',
              padding: '8px 10px',
              fontSize: 13,
              outline: 'none',
              letterSpacing: '0.08em',
            }}
          />
        </div>

        <PinField label="New PIN" value={newPin} onChange={setNewPin} />
        <PinField label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} />

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
            disabled={busy || !code || !newPin}
            className="ui-b wobble"
            style={{
              flex: 1,
              border: '1.5px solid var(--sage-deep)',
              background: 'var(--sage)',
              color: 'var(--paper)',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Recovering…' : 'Recover'}
          </button>
        </div>
      </form>
    </div>
  );
}
