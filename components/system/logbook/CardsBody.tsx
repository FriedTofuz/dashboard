'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { confirm as themedConfirm } from '@/lib/store/useConfirmStore';
import { toast, toastSuccess } from '@/lib/store/useToastStore';
import { getDb, type Card, type CardKind } from '@/lib/idb/db';
import {
  createCard,
  deleteCard,
  updateCard,
  type NewCardInput,
} from '@/lib/idb/cards';
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

interface CardsBodyProps {
  userId: string;
}

const KIND_LABELS: Record<CardKind, string> = {
  payment:    'Payment',
  insurance:  'Insurance',
  membership: 'Membership',
  other:      'Other',
};

const KIND_DOTS: Record<CardKind, string> = {
  payment:    'var(--sage-deep)',
  insurance:  'var(--terra-deep)',
  membership: 'var(--ochre-deep)',
  other:      'var(--ink-faint)',
};

type ScopeFilter = 'all' | CardKind;

export function CardsBody({ userId }: CardsBodyProps) {
  const cards = useLiveQuery(
    () => getDb().cards.where('user_id').equals(userId).toArray(),
    [userId],
    [] as Card[],
  );

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [editing, setEditing] = useState<Card | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = (cards ?? []).slice().sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    return all
      .filter((c) => scope === 'all' || c.kind === scope)
      .filter((c) =>
        !q
          ? true
          : [c.name, c.cardholder, c.issuer, c.number, KIND_LABELS[c.kind]]
              .join(' ')
              .toLowerCase()
              .includes(q),
      );
  }, [cards, query, scope]);

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
            padding: '4px 6px 4px 12px',
            gap: 6,
          }}
        >
          <span className="ui" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, issuer, cardholder…"
            aria-label="Search cards"
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
            onChange={(e) => setScope(e.target.value as ScopeFilter)}
            aria-label="Filter by kind"
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
            <option value="all">All kinds</option>
            <option value="payment">Payment</option>
            <option value="insurance">Insurance</option>
            <option value="membership">Membership</option>
            <option value="other">Other</option>
          </select>
        </div>
        <PrimaryButton label="+ New Card" onClick={() => setCreating(true)} />
      </div>

      <div className="col" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {filtered.length === 0 ? (
          <EmptyState
            title={cards && cards.length === 0 ? 'no cards yet' : 'nothing matches'}
            sub={
              cards && cards.length === 0
                ? 'click "+ New Card" to save your first entry'
                : 'try a different search'
            }
          />
        ) : (
          filtered.map((c) => (
            <CardRow
              key={c.id}
              entry={c}
              onEdit={() => setEditing(c)}
              onDelete={async () => {
                const ok = await themedConfirm({
                  title: `delete "${c.name}"?`,
                  body: 'this card will be removed from all devices.',
                  confirmLabel: 'delete',
                  cancelLabel: 'keep it',
                  danger: true,
                });
                if (!ok) return;
                await deleteCard(c.id);
                toast(`deleted "${c.name}"`);
              }}
            />
          ))
        )}
      </div>

      {creating && <CardEditor mode="create" userId={userId} onClose={() => setCreating(false)} />}
      {editing && (
        <CardEditor
          mode="edit"
          userId={userId}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function maskNumber(n: string): string {
  if (!n) return '';
  const digits = n.replace(/\s/g, '');
  if (digits.length <= 4) return digits;
  return `••••  ${digits.slice(-4)}`;
}

function CardRow({
  entry, onEdit, onDelete,
}: {
  entry: Card;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  function copyVal(text: string, label: string) {
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
          <span
            className="ui-b"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: KIND_DOTS[entry.kind],
                display: 'inline-block',
              }}
            />
            {KIND_LABELS[entry.kind]}
          </span>
          {entry.issuer && (
            <span className="ui" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              {entry.issuer}
            </span>
          )}
          {entry.cardholder && (
            <span className="ui" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              {entry.cardholder}
            </span>
          )}
          {entry.expires && (
            <span
              className="mono num"
              style={{ fontSize: 11, color: 'var(--ink-faint)' }}
            >
              exp {entry.expires}
            </span>
          )}
        </>
      }
      meta={
        <code
          className="mono num"
          onClick={() => entry.number && copyVal(entry.number, 'number')}
          title={entry.number ? 'Click to copy' : ''}
          style={{
            background: 'var(--paper-warm)',
            padding: '4px 8px',
            borderRadius: 4,
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
            fontSize: 12,
            minWidth: 120,
            textAlign: 'center',
            cursor: entry.number ? 'pointer' : 'default',
          }}
        >
          {revealed ? entry.number || '—' : maskNumber(entry.number) || '—'}
        </code>
      }
      actions={
        <>
          <IconButton
            onClick={() => setRevealed((v) => !v)}
            label={revealed ? 'Hide number' : 'Show number'}
          >
            {revealed ? '🙈' : '👁'}
          </IconButton>
          <IconButton onClick={onEdit} label="Edit">✎</IconButton>
          <IconButton onClick={onDelete} label="Delete" danger>🗑</IconButton>
        </>
      }
    />
  );
}

function CardEditor({
  mode, userId, entry, onClose,
}: {
  mode: 'create' | 'edit';
  userId: string;
  entry?: Card;
  onClose: () => void;
}) {
  const [name, setName] = useState(entry?.name ?? '');
  const [kind, setKind] = useState<CardKind>(entry?.kind ?? 'payment');
  const [cardholder, setCardholder] = useState(entry?.cardholder ?? '');
  const [number, setNumber] = useState(entry?.number ?? '');
  const [expires, setExpires] = useState(entry?.expires ?? '');
  const [security_code, setSecurity] = useState(entry?.security_code ?? '');
  const [issuer, setIssuer] = useState(entry?.issuer ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  const numberLabel =
    kind === 'insurance' ? 'Member ID' :
    kind === 'membership' ? 'Member #' :
    kind === 'other' ? 'Number / ID' :
    'Card number';

  const securityLabel =
    kind === 'insurance' ? 'Group # (optional)' :
    kind === 'payment' ? 'Security code (CVV)' :
    'Code (optional)';

  const issuerLabel =
    kind === 'insurance' ? 'Insurer' :
    kind === 'payment' ? 'Bank / issuer' :
    'Issued by';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const payload: NewCardInput = {
      name: name.trim(),
      kind,
      cardholder: cardholder.trim(),
      number,
      expires: expires.trim(),
      security_code,
      issuer: issuer.trim(),
      notes: notes.trim(),
    };
    if (mode === 'create') {
      await createCard(payload, userId);
      toastSuccess('saved');
    } else if (entry) {
      await updateCard(entry.id, payload);
      toastSuccess('updated');
    }
    setSaving(false);
    onClose();
  }

  return (
    <EditorShell
      title={mode === 'create' ? 'New card' : `Edit ${entry?.name ?? ''}`}
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
      <Field label="Display name" required autoFocus value={name} onChange={setName} placeholder="e.g. Chase Sapphire, Aetna PPO" />

      <div className="col" style={{ gap: 4 }}>
        <FieldLabel label="Kind" />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CardKind)}
          className="ui"
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="payment">Payment</option>
          <option value="insurance">Insurance</option>
          <option value="membership">Membership</option>
          <option value="other">Other</option>
        </select>
      </div>

      <Field label="Cardholder name" value={cardholder} onChange={setCardholder} />
      <Field label={issuerLabel} value={issuer} onChange={setIssuer} />

      <div className="col" style={{ gap: 4 }}>
        <FieldLabel label={numberLabel} />
        <div className="row items-center" style={{ gap: 6 }}>
          <input
            type={reveal ? 'text' : 'password'}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="ui num"
            style={inputStyle}
            placeholder={kind === 'payment' ? '4242 4242 4242 4242' : ''}
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
            aria-label={reveal ? 'Hide number' : 'Show number'}
          >
            {reveal ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label={kind === 'payment' ? 'Expires (MM/YY)' : 'Renews / expires'} value={expires} onChange={setExpires} placeholder={kind === 'payment' ? 'MM/YY' : ''} />
        </div>
        <div style={{ flex: 1 }}>
          <Field label={securityLabel} value={security_code} onChange={setSecurity} />
        </div>
      </div>

      <TextAreaField label="Notes" value={notes} onChange={setNotes} rows={3} />
    </EditorShell>
  );
}
