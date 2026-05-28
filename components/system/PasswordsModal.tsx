'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '@/lib/store/useUiStore';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { getDb, type Password } from '@/lib/idb/db';
import {
  createPassword,
  deletePassword,
  updatePassword,
  hashPin,
  ensureDefaultPin,
  setPin,
  type NewPasswordInput,
} from '@/lib/idb/passwords';

interface PasswordsModalProps {
  userId: string;
}

type SearchScope = 'all' | 'username';

/** Top-level modal: gates on PIN, then renders the manager UI. The PIN
 *  prompt re-runs every time the modal opens — there's no in-session unlock
 *  carried across open/close cycles. */
export function PasswordsModal({ userId }: PasswordsModalProps) {
  const open = useUiStore((s) => s.passwordsOpen);
  const close = () => useUiStore.getState().setPasswordsOpen(false);

  const [unlocked, setUnlocked] = useState(false);

  // Re-lock whenever the modal closes.
  useEffect(() => {
    if (!open) setUnlocked(false);
  }, [open]);

  // Seed the default PIN on first run so the user can unlock with 24850
  // without any setup step.
  useEffect(() => {
    if (open) void ensureDefaultPin(userId);
  }, [open, userId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)', zIndex: 80 }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="passwords-title"
    >
      <div
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: unlocked ? 'min(900px, 94vw)' : 'min(380px, 92vw)',
          height: unlocked ? 'min(640px, 88vh)' : undefined,
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        {unlocked ? (
          <PasswordsBody userId={userId} onClose={close} />
        ) : (
          <PinLockBody userId={userId} onUnlock={() => setUnlocked(true)} onCancel={close} />
        )}
      </div>
    </div>
  );
}

// ── PIN lock screen ────────────────────────────────────────────────────

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
    <div className="col" style={{ padding: '28px 28px 24px', gap: 16 }}>
      <h2
        id="passwords-title"
        className="hand"
        style={{
          fontSize: 24,
          lineHeight: 1.1,
          fontWeight: 600,
          margin: 0,
          color: 'var(--ink)',
        }}
      >
        <span className="underline-hand">Passwords</span>
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
        Enter your PIN to unlock the password manager.
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
          <span
            className="ui"
            style={{ fontSize: 12, color: 'var(--terra-deep)' }}
          >
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

// ── Unlocked: list + search + new ───────────────────────────────────────

function PasswordsBody({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const passwords = useLiveQuery(
    () => getDb().passwords.where('user_id').equals(userId).toArray(),
    [userId],
    [] as Password[],
  );

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [editing, setEditing] = useState<Password | null>(null);
  const [creating, setCreating] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = (passwords ?? []).slice().sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    if (!q) return all;
    return all.filter((p) => {
      if (scope === 'username') {
        return p.username.toLowerCase().includes(q);
      }
      return (
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.sites.toLowerCase().includes(q)
      );
    });
  }, [passwords, query, scope]);

  return (
    <>
      {/* Header */}
      <div
        className="row items-center justify-between"
        style={{
          padding: '16px 22px 14px',
          borderBottom: '1.5px solid var(--rule)',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <h2
          id="passwords-title"
          className="hand"
          style={{
            fontSize: 22,
            lineHeight: 1.1,
            fontWeight: 600,
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          <span className="underline-hand">Passwords</span>
        </h2>
        <div className="row items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => setChangingPin(true)}
            className="ui wobble hover:bg-paper-warm transition-colors"
            style={{
              border: '1.5px solid var(--ink-soft)',
              background: 'var(--paper)',
              color: 'var(--ink-faint)',
              padding: '6px 12px',
              borderRadius: 5,
              fontSize: 12,
              cursor: 'pointer',
            }}
            title="Change PIN"
          >
            Change PIN
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ui hover:bg-paper-warm transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-faint)',
              fontSize: 22,
              lineHeight: 1,
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            aria-label="Close passwords"
          >
            ×
          </button>
        </div>
      </div>

      {/* Search + new */}
      <div
        className="row items-center"
        style={{
          padding: '14px 22px',
          gap: 10,
          flexShrink: 0,
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div
          className="row items-center"
          style={{
            flex: 1,
            border: '1.5px solid var(--ink-soft)',
            borderRadius: 6,
            background: 'var(--paper)',
            padding: '4px 6px 4px 12px',
            gap: 6,
          }}
        >
          <span
            className="ui"
            style={{ fontSize: 13, color: 'var(--ink-faint)' }}
            aria-hidden
          >
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              scope === 'username'
                ? 'Search by username/email…'
                : 'Search site or username…'
            }
            aria-label="Search passwords"
            className="ui"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: 14,
              padding: '6px 0',
            }}
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as SearchScope)}
            aria-label="Search filter"
            className="ui"
            style={{
              border: '1px solid var(--ink-soft)',
              borderRadius: 4,
              background: 'var(--paper)',
              color: 'var(--ink-faint)',
              padding: '4px 6px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <option value="all">All fields</option>
            <option value="username">Username / email</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ui-b wobble transition-colors"
          style={{
            border: '1.5px solid var(--terra-deep)',
            background: 'var(--terra)',
            color: 'var(--paper)',
            padding: '8px 14px',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + New Password
        </button>
      </div>

      {/* List */}
      <div
        className="col"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}
      >
        {filtered.length === 0 ? (
          <div
            className="col"
            style={{
              padding: '40px 22px',
              textAlign: 'center',
              gap: 6,
              color: 'var(--ink-faint)',
            }}
          >
            <span className="hand" style={{ fontSize: 20, color: 'var(--ink)' }}>
              {passwords && passwords.length === 0
                ? 'no passwords yet'
                : 'nothing matches'}
            </span>
            <span className="ui" style={{ fontSize: 13 }}>
              {passwords && passwords.length === 0
                ? 'click "+ New Password" to save your first entry'
                : 'try a different search'}
            </span>
          </div>
        ) : (
          filtered.map((p) => (
            <PasswordRow
              key={p.id}
              entry={p}
              onEdit={() => setEditing(p)}
              onDelete={async () => {
                const ok = await themedConfirm({
                  title: `delete "${p.name}"?`,
                  body: 'this password will be removed from all devices.',
                  confirmLabel: 'delete',
                  cancelLabel: 'keep it',
                  danger: true,
                });
                if (!ok) return;
                await deletePassword(p.id);
                toast(`deleted "${p.name}"`);
              }}
            />
          ))
        )}
      </div>

      {creating && (
        <PasswordEditor
          mode="create"
          userId={userId}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <PasswordEditor
          mode="edit"
          userId={userId}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {changingPin && (
        <ChangePinDialog
          userId={userId}
          onClose={() => setChangingPin(false)}
        />
      )}
    </>
  );
}

// ── Password list row ───────────────────────────────────────────────────

function PasswordRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Password;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  function copy(text: string, label: string) {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => toastSuccess(`copied ${label}`))
      .catch(() => toast(`couldn't copy ${label}`));
  }

  return (
    <div
      className="row items-center group hover:bg-paper-warm transition-colors"
      style={{
        padding: '10px 22px',
        gap: 14,
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div className="col" style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <span
          className="ui-b"
          style={{
            fontSize: 14,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {entry.name}
        </span>
        <div className="row items-center" style={{ gap: 12, flexWrap: 'wrap' }}>
          {entry.username && (
            <button
              type="button"
              onClick={() => copy(entry.username, 'username')}
              className="ui hover:underline"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-faint)',
                fontSize: 12,
                padding: 0,
                cursor: 'pointer',
              }}
              title="Click to copy"
            >
              {entry.username}
            </button>
          )}
          {entry.sites && (
            <span
              className="ui num"
              style={{
                color: 'var(--ink-faint)',
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 240,
              }}
              title={entry.sites}
            >
              {entry.sites.split(/[\n,]+/)[0].trim()}
            </span>
          )}
        </div>
      </div>

      <div className="row items-center" style={{ gap: 6 }}>
        <code
          className="mono num"
          onClick={() => entry.password && copy(entry.password, 'password')}
          title={entry.password ? 'Click to copy' : ''}
          style={{
            background: 'var(--paper-warm)',
            padding: '4px 8px',
            borderRadius: 4,
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
            fontSize: 12,
            minWidth: 100,
            textAlign: 'center',
            cursor: entry.password ? 'pointer' : 'default',
            letterSpacing: revealed ? '0.02em' : '0.18em',
          }}
        >
          {revealed ? entry.password : '••••••••'}
        </code>
        <IconButton
          onClick={() => setRevealed((v) => !v)}
          label={revealed ? 'Hide password' : 'Show password'}
        >
          {revealed ? '🙈' : '👁'}
        </IconButton>
        <IconButton onClick={onEdit} label="Edit">
          ✎
        </IconButton>
        <IconButton onClick={onDelete} label="Delete" danger>
          🗑
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="hover:bg-paper-warm transition-colors"
      style={{
        background: 'transparent',
        border: 'none',
        color: danger ? 'var(--terra-deep)' : 'var(--ink-faint)',
        fontSize: 14,
        padding: '4px 8px',
        borderRadius: 4,
        cursor: 'pointer',
        minWidth: 28,
        minHeight: 28,
      }}
    >
      {children}
    </button>
  );
}

// ── Create/edit form ────────────────────────────────────────────────────

function PasswordEditor({
  mode,
  userId,
  entry,
  onClose,
}: {
  mode: 'create' | 'edit';
  userId: string;
  entry?: Password;
  onClose: () => void;
}) {
  const [name, setName] = useState(entry?.name ?? '');
  const [username, setUsername] = useState(entry?.username ?? '');
  const [password, setPassword] = useState(entry?.password ?? '');
  const [sites, setSites] = useState(entry?.sites ?? '');
  const [note, setNote] = useState(entry?.note ?? '');
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const payload: NewPasswordInput = {
      name: name.trim(),
      username: username.trim(),
      password,
      sites: sites.trim(),
      note: note.trim(),
    };
    if (mode === 'create') {
      await createPassword(payload, userId);
      toastSuccess('saved');
    } else if (entry) {
      await updatePassword(entry.id, payload);
      toastSuccess('updated');
    }
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
          width: 'min(440px, 92vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
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
          {mode === 'create' ? 'New password' : `Edit ${entry?.name ?? ''}`}
        </h3>

        <Field
          label="Name of site / app"
          required
          value={name}
          onChange={setName}
          autoFocus
        />
        <Field
          label="Username / email"
          value={username}
          onChange={setUsername}
        />

        <div className="col" style={{ gap: 4 }}>
          <FieldLabel label="Password" />
          <div className="row items-center" style={{ gap: 6 }}>
            <input
              type={reveal ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui num"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="ui hover:bg-paper-warm transition-colors"
              style={{
                background: 'transparent',
                border: '1.5px solid var(--ink-soft)',
                color: 'var(--ink-faint)',
                fontSize: 14,
                padding: '6px 10px',
                borderRadius: 5,
                cursor: 'pointer',
              }}
              aria-label={reveal ? 'Hide password' : 'Show password'}
            >
              {reveal ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="col" style={{ gap: 4 }}>
          <FieldLabel label="Sites / links" />
          <textarea
            value={sites}
            onChange={(e) => setSites(e.target.value)}
            placeholder={'e.g. https://example.com\nhttps://example.org'}
            rows={2}
            className="ui"
            style={{
              ...inputStyle,
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
              fontSize: 12,
              resize: 'vertical',
              minHeight: 50,
            }}
          />
        </div>

        <div className="col" style={{ gap: 4 }}>
          <FieldLabel label="Note (optional)" />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="ui"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
          />
        </div>

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
            disabled={!name.trim() || saving}
            className="ui-b wobble transition-colors"
            style={{
              flex: 1,
              border: '1.5px solid var(--sage-deep)',
              background: 'var(--sage)',
              color: 'var(--paper)',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
              opacity: !name.trim() || saving ? 0.6 : 1,
            }}
          >
            {mode === 'create' ? 'Save' : 'Update'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Change-PIN dialog ───────────────────────────────────────────────────

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

// ── Atoms ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--ink-soft)',
  borderRadius: 5,
  background: 'var(--paper)',
  color: 'var(--ink)',
  padding: '8px 10px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

function FieldLabel({ label }: { label: string }) {
  return (
    <span
      className="tiny"
      style={{ letterSpacing: '0.12em', color: 'var(--ink-faint)' }}
    >
      {label}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <FieldLabel label={required ? `${label} *` : label} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="ui"
        style={inputStyle}
      />
    </div>
  );
}

function PinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <FieldLabel label={label} />
      <input
        type="password"
        inputMode="numeric"
        maxLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="ui-b num"
        style={{
          ...inputStyle,
          fontSize: 18,
          letterSpacing: '0.4em',
          textAlign: 'center',
        }}
      />
    </div>
  );
}
