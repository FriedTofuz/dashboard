'use client';

import type React from 'react';

/** Shared inline style + atoms for the Logbook tabs. Kept in one place so
 *  Passwords / Contacts / Cards all share the same paper-and-ink form chrome. */

export const inputStyle: React.CSSProperties = {
  border: '1.5px solid var(--ink-soft)',
  borderRadius: 5,
  background: 'var(--paper)',
  color: 'var(--ink)',
  padding: '8px 10px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};

export function FieldLabel({ label }: { label: string }) {
  return (
    <span
      className="tiny"
      style={{ letterSpacing: '0.12em', color: 'var(--ink-faint)' }}
    >
      {label}
    </span>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel';
}

export function Field({
  label, value, onChange, required, autoFocus, placeholder, type = 'text',
}: FieldProps) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <FieldLabel label={required ? `${label} *` : label} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="ui"
        style={inputStyle}
      />
    </div>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}

export function TextAreaField({
  label, value, onChange, rows = 2, placeholder, mono,
}: TextAreaProps) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <FieldLabel label={label} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="ui"
        style={{
          ...inputStyle,
          fontFamily: mono
            ? 'var(--font-jetbrains-mono), ui-monospace, monospace'
            : undefined,
          fontSize: mono ? 12 : 13,
          resize: 'vertical',
          minHeight: rows * 22,
        }}
      />
    </div>
  );
}

interface IconButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}

export function IconButton({ children, onClick, label, danger }: IconButtonProps) {
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

interface PrimaryButtonProps {
  label: string;
  onClick: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function PrimaryButton({ label, onClick, type = 'button', disabled }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="ui-b wobble transition-colors"
      style={{
        border: '1.5px solid var(--terra-deep)',
        background: 'var(--terra)',
        color: 'var(--paper)',
        padding: '8px 14px',
        borderRadius: 6,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

interface SecondaryButtonProps {
  label: string;
  onClick: () => void;
  flex?: boolean;
}

export function SecondaryButton({ label, onClick, flex }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui wobble hover:bg-paper-warm transition-colors"
      style={{
        flex: flex ? 1 : undefined,
        border: '1.5px solid var(--ink-soft)',
        background: 'var(--paper)',
        color: 'var(--ink)',
        padding: '10px 14px',
        borderRadius: 6,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

interface SaveButtonProps {
  label: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  flex?: boolean;
}

export function SaveButton({
  label, type = 'submit', disabled, onClick, flex,
}: SaveButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="ui-b wobble transition-colors"
      style={{
        flex: flex ? 1 : undefined,
        border: '1.5px solid var(--sage-deep)',
        background: 'var(--sage)',
        color: 'var(--paper)',
        padding: '10px 14px',
        borderRadius: 6,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

/** Wraps a modal editor (the popup that asks for create/edit details). */
interface EditorShellProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function EditorShell({ title, onClose, onSubmit, children, footer }: EditorShellProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.55)', zIndex: 90 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        className="paper wobble col"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(480px, 92vw)',
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
          {title}
        </h3>
        {children}
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          {footer}
        </div>
      </form>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  sub: string;
}

export function EmptyState({ title, sub }: EmptyStateProps) {
  return (
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
        {title}
      </span>
      <span className="ui" style={{ fontSize: 13 }}>{sub}</span>
    </div>
  );
}

interface ListRowShellProps {
  title: string;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actions: React.ReactNode;
}

/** Common look for a single row in any Logbook list. */
export function ListRowShell({ title, subtitle, meta, actions }: ListRowShellProps) {
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
          {title}
        </span>
        {subtitle && (
          <div className="row items-center" style={{ gap: 12, flexWrap: 'wrap' }}>
            {subtitle}
          </div>
        )}
      </div>
      {meta && <div className="row items-center" style={{ gap: 8 }}>{meta}</div>}
      <div className="row items-center" style={{ gap: 6 }}>{actions}</div>
    </div>
  );
}
