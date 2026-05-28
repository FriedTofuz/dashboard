'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { getDb, type Password } from '@/lib/idb/db';
import {
  createPassword,
  deletePassword,
  updatePassword,
  type NewPasswordInput,
} from '@/lib/idb/passwords';
import {
  EditorShell,
  EmptyState,
  Field,
  FieldLabel,
  IconButton,
  ListRowShell,
  PrimaryButton,
  SaveButton,
  SecondaryButton,
  TextAreaField,
  inputStyle,
} from './shared';

type SearchScope = 'all' | 'username';

interface PasswordsBodyProps {
  userId: string;
}

export function PasswordsBody({ userId }: PasswordsBodyProps) {
  const passwords = useLiveQuery(
    () => getDb().passwords.where('user_id').equals(userId).toArray(),
    [userId],
    [] as Password[],
  );

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [editing, setEditing] = useState<Password | null>(null);
  const [creating, setCreating] = useState(false);

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
    <div className="col" style={{ flex: 1, minHeight: 0 }}>
      <Toolbar
        query={query}
        setQuery={setQuery}
        scope={scope}
        setScope={setScope}
        onNew={() => setCreating(true)}
      />
      <div className="col" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {filtered.length === 0 ? (
          <EmptyState
            title={passwords && passwords.length === 0 ? 'no passwords yet' : 'nothing matches'}
            sub={
              passwords && passwords.length === 0
                ? 'click "+ New Password" to save your first entry'
                : 'try a different search'
            }
          />
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
    </div>
  );
}

function Toolbar({
  query, setQuery, scope, setScope, onNew,
}: {
  query: string;
  setQuery: (v: string) => void;
  scope: SearchScope;
  setScope: (s: SearchScope) => void;
  onNew: () => void;
}) {
  return (
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
        <span className="ui" style={{ fontSize: 13, color: 'var(--ink-faint)' }} aria-hidden>🔍</span>
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
      <PrimaryButton label="+ New Password" onClick={onNew} />
    </div>
  );
}

function PasswordRow({
  entry, onEdit, onDelete,
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
    <ListRowShell
      title={entry.name}
      subtitle={
        <>
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
        </>
      }
      meta={
        <>
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
        </>
      }
      actions={
        <>
          <IconButton onClick={() => setRevealed((v) => !v)} label={revealed ? 'Hide password' : 'Show password'}>
            {revealed ? '🙈' : '👁'}
          </IconButton>
          <IconButton onClick={onEdit} label="Edit">✎</IconButton>
          <IconButton onClick={onDelete} label="Delete" danger>🗑</IconButton>
        </>
      }
    />
  );
}

function PasswordEditor({
  mode, userId, entry, onClose,
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
    <EditorShell
      title={mode === 'create' ? 'New password' : `Edit ${entry?.name ?? ''}`}
      onClose={onClose}
      onSubmit={handleSave}
      footer={
        <>
          <SecondaryButton flex label="Cancel" onClick={onClose} />
          <SaveButton
            flex
            type="submit"
            disabled={!name.trim() || saving}
            label={mode === 'create' ? 'Save' : 'Update'}
          />
        </>
      }
    >
      <Field label="Name of site / app" required autoFocus value={name} onChange={setName} />
      <Field label="Username / email" value={username} onChange={setUsername} />

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

      <TextAreaField
        label="Sites / links"
        value={sites}
        onChange={setSites}
        placeholder={'e.g. https://example.com\nhttps://example.org'}
        mono
      />
      <TextAreaField
        label="Note (optional)"
        value={note}
        onChange={setNote}
      />
    </EditorShell>
  );
}
