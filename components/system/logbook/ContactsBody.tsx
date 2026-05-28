'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { getDb, type Contact } from '@/lib/idb/db';
import {
  createContact,
  deleteContact,
  updateContact,
  type NewContactInput,
} from '@/lib/idb/contacts';
import {
  EditorShell,
  EmptyState,
  Field,
  IconButton,
  ListRowShell,
  PrimaryButton,
  SaveButton,
  SecondaryButton,
  TextAreaField,
} from './shared';

interface ContactsBodyProps {
  userId: string;
}

function fullName(c: Contact): string {
  const n = `${c.first_name} ${c.last_name}`.trim();
  return n || c.company || '(no name)';
}

export function ContactsBody({ userId }: ContactsBodyProps) {
  const contacts = useLiveQuery(
    () => getDb().contacts.where('user_id').equals(userId).toArray(),
    [userId],
    [] as Contact[],
  );

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = (contacts ?? []).slice().sort((a, b) =>
      fullName(a).localeCompare(fullName(b), undefined, { sensitivity: 'base' }),
    );
    if (!q) return all;
    return all.filter((c) =>
      [c.first_name, c.last_name, c.company, c.email, c.phone]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [contacts, query]);

  return (
    <div className="col" style={{ flex: 1, minHeight: 0 }}>
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
            padding: '4px 12px',
            gap: 6,
          }}
        >
          <span className="ui" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, email, phone…"
            aria-label="Search contacts"
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
        </div>
        <PrimaryButton label="+ New Contact" onClick={() => setCreating(true)} />
      </div>

      <div className="col" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {filtered.length === 0 ? (
          <EmptyState
            title={contacts && contacts.length === 0 ? 'no contacts yet' : 'nothing matches'}
            sub={
              contacts && contacts.length === 0
                ? 'click "+ New Contact" to save your first entry'
                : 'try a different search'
            }
          />
        ) : (
          filtered.map((c) => (
            <ContactRow
              key={c.id}
              entry={c}
              onEdit={() => setEditing(c)}
              onDelete={async () => {
                const ok = await themedConfirm({
                  title: `delete "${fullName(c)}"?`,
                  body: 'this contact will be removed from all devices.',
                  confirmLabel: 'delete',
                  cancelLabel: 'keep it',
                  danger: true,
                });
                if (!ok) return;
                await deleteContact(c.id);
                toast(`deleted "${fullName(c)}"`);
              }}
            />
          ))
        )}
      </div>

      {creating && (
        <ContactEditor mode="create" userId={userId} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <ContactEditor
          mode="edit"
          userId={userId}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function copy(text: string, label: string) {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => toastSuccess(`copied ${label}`))
    .catch(() => toast(`couldn't copy ${label}`));
}

function ContactRow({
  entry, onEdit, onDelete,
}: {
  entry: Contact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ListRowShell
      title={fullName(entry)}
      subtitle={
        <>
          {entry.company && (
            <span className="ui" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              {entry.company}
            </span>
          )}
          {entry.pronouns && (
            <span
              className="ui"
              style={{
                fontSize: 11,
                color: 'var(--ink-faint)',
                fontStyle: 'italic',
              }}
            >
              ({entry.pronouns})
            </span>
          )}
          {entry.phone && (
            <button
              type="button"
              onClick={() => copy(entry.phone, 'phone')}
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
              {entry.phone}
            </button>
          )}
          {entry.email && (
            <button
              type="button"
              onClick={() => copy(entry.email, 'email')}
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
              {entry.email}
            </button>
          )}
        </>
      }
      actions={
        <>
          <IconButton onClick={onEdit} label="Edit">✎</IconButton>
          <IconButton onClick={onDelete} label="Delete" danger>🗑</IconButton>
        </>
      }
    />
  );
}

function ContactEditor({
  mode, userId, entry, onClose,
}: {
  mode: 'create' | 'edit';
  userId: string;
  entry?: Contact;
  onClose: () => void;
}) {
  const [first_name, setFirst] = useState(entry?.first_name ?? '');
  const [last_name, setLast] = useState(entry?.last_name ?? '');
  const [company, setCompany] = useState(entry?.company ?? '');
  const [phone, setPhone] = useState(entry?.phone ?? '');
  const [email, setEmail] = useState(entry?.email ?? '');
  const [pronouns, setPronouns] = useState(entry?.pronouns ?? '');
  const [address, setAddress] = useState(entry?.address ?? '');
  const [birthday, setBirthday] = useState(entry?.birthday ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const hasAny =
    !!first_name.trim() || !!last_name.trim() || !!company.trim();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAny) return;
    setSaving(true);
    const payload: NewContactInput = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      company: company.trim(),
      phone: phone.trim(),
      email: email.trim(),
      pronouns: pronouns.trim(),
      address: address.trim(),
      birthday: birthday.trim(),
      notes: notes.trim(),
    };
    if (mode === 'create') {
      await createContact(payload, userId);
      toastSuccess('saved');
    } else if (entry) {
      await updateContact(entry.id, payload);
      toastSuccess('updated');
    }
    setSaving(false);
    onClose();
  }

  return (
    <EditorShell
      title={mode === 'create' ? 'New contact' : `Edit ${fullName(entry as Contact)}`}
      onClose={onClose}
      onSubmit={handleSave}
      footer={
        <>
          <SecondaryButton flex label="Cancel" onClick={onClose} />
          <SaveButton
            flex
            type="submit"
            disabled={!hasAny || saving}
            label={mode === 'create' ? 'Save' : 'Update'}
          />
        </>
      }
    >
      <div className="row" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="First name" value={first_name} onChange={setFirst} autoFocus />
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Last name" value={last_name} onChange={setLast} />
        </div>
      </div>
      <Field label="Company" value={company} onChange={setCompany} />
      <div className="row" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="(555) 123-4567" />
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Email" value={email} onChange={setEmail} type="email" />
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Pronouns" value={pronouns} onChange={setPronouns} placeholder="she/her, he/him, they/them…" />
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Birthday" value={birthday} onChange={setBirthday} placeholder="MM/DD or Oct 4" />
        </div>
      </div>
      <TextAreaField label="Address" value={address} onChange={setAddress} rows={2} />
      <TextAreaField label="Notes" value={notes} onChange={setNotes} rows={3} />
    </EditorShell>
  );
}
