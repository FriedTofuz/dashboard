'use client';

import { useState } from 'react';
import { useUiStore } from '@/lib/store/useUiStore';
import { useThemeStore, type ThemeMode } from '@/lib/store/useThemeStore';
import {
  useAccentStore,
  ACCENT_PALETTES,
  type AccentPalette,
} from '@/lib/store/useAccentStore';

type Section = 'general' | 'appearance' | 'habits' | 'labels' | 'quotes' | 'about';

interface NavItem {
  id: Section;
  label: string;
}

const NAV: NavItem[] = [
  { id: 'general',     label: 'General' },
  { id: 'appearance',  label: 'Appearance' },
  { id: 'habits',      label: 'Habits' },
  { id: 'labels',      label: 'Labels' },
  { id: 'quotes',      label: 'Quotes' },
  { id: 'about',       label: 'About' },
];

/** Themed settings panel — sidebar + content layout (Claude Desktop shape).
 *  Surfaces appearance controls inline; deep-links to existing manager
 *  modals for the content libraries (habits / labels / quotes). */
export function SettingsModal() {
  const open = useUiStore((s) => s.settingsOpen);
  const close = () => useUiStore.getState().setSettingsOpen(false);
  const [section, setSection] = useState<Section>('general');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(28, 24, 20, 0.45)', zIndex: 70 }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className="paper wobble row"
        style={{
          border: '1.5px solid var(--ink-soft)',
          borderRadius: 8,
          width: 'min(880px, 92vw)',
          height: 'min(560px, 86vh)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <aside
          className="col"
          style={{
            width: 200,
            borderRight: '1.5px solid var(--rule)',
            background: 'var(--paper-warm)',
            padding: '20px 12px',
            gap: 4,
          }}
        >
          <h2
            id="settings-title"
            className="hand"
            style={{
              fontSize: 22,
              lineHeight: 1.1,
              fontWeight: 600,
              margin: '0 0 14px 6px',
              color: 'var(--ink)',
            }}
          >
            Settings
          </h2>
          {NAV.map((item) => {
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
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
        </aside>

        {/* Content */}
        <section
          className="col"
          style={{
            flex: 1,
            padding: '20px 28px',
            overflowY: 'auto',
            gap: 18,
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={close}
            className="ui hover:bg-paper-warm transition-colors"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-faint)',
              fontSize: 18,
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            aria-label="Close settings"
          >
            ×
          </button>

          {section === 'general'    && <GeneralPanel onClose={close} />}
          {section === 'appearance' && <AppearancePanel />}
          {section === 'habits'     && <DeepLinkPanel
            title="Habits"
            description="Manage the daily habit templates that auto-create each morning."
            buttonLabel="Open habits editor"
            onClick={() => { close(); useUiStore.getState().setHabitsEditorOpen(true); }}
          />}
          {section === 'labels'     && <DeepLinkPanel
            title="Labels"
            description="Create, rename, and reorder labels. Labels can be assigned to tasks from the search modal or the task editor."
            buttonLabel="Open labels manager"
            onClick={() => { close(); useUiStore.getState().setLabelsManagerOpen(true); }}
          />}
          {section === 'quotes'     && <DeepLinkPanel
            title="Quotes"
            description="Add quotes that rotate on the Sunflower card each day."
            buttonLabel="Open quotes manager"
            onClick={() => { close(); useUiStore.getState().setQuotesManagerOpen(true); }}
          />}
          {section === 'about'      && <AboutPanel />}
        </section>
      </div>
    </div>
  );
}

// ── Panel: General ─────────────────────────────────────────────────────

function GeneralPanel({ onClose }: { onClose: () => void }) {
  const syncStatus = useUiStore((s) => s.syncStatus);
  const lastSyncedAt = useUiStore((s) => s.lastSyncedAt);

  return (
    <div className="col" style={{ gap: 16 }}>
      <PanelHeading title="General" />
      <Row
        label="Sync status"
        description={
          syncStatus === 'syncing'
            ? 'syncing…'
            : syncStatus === 'error'
              ? 'offline — changes will sync when you reconnect'
              : lastSyncedAt
                ? `last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                : 'idle'
        }
      />
      <Row
        label="Keyboard shortcuts"
        description="Press / or ⌘K anywhere to open the command palette. Other shortcuts: N (new), T (today), L (log day), S (search), F (friday), ←/→ (prev/next day)."
      />
      <Row
        label="Notepad archive"
        description="Browse your previous days' notes in one place."
        action={
          <SettingButton
            onClick={() => { onClose(); useUiStore.getState().setNotepadArchiveOpen(true); }}
          >
            Open archive
          </SettingButton>
        }
      />
    </div>
  );
}

// ── Panel: Appearance ──────────────────────────────────────────────────

function AppearancePanel() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const accent = useAccentStore((s) => s.accent);
  const setAccent = useAccentStore((s) => s.setAccent);

  const modes: Array<{ id: ThemeMode; label: string }> = [
    { id: 'light',  label: 'Light' },
    { id: 'dark',   label: 'Dark' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="col" style={{ gap: 20 }}>
      <PanelHeading title="Appearance" />

      <div className="col" style={{ gap: 6 }}>
        <span className="tiny">theme</span>
        <div className="row" style={{ gap: 8 }}>
          {modes.map((m) => {
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="ui wobble transition-colors hover:bg-paper-warm"
                style={{
                  border: `1.5px solid ${active ? 'var(--terra-deep)' : 'var(--ink-soft)'}`,
                  background: active ? 'var(--terra-tint)' : 'var(--paper)',
                  color: active ? 'var(--terra-deep)' : 'var(--ink)',
                  padding: '6px 14px',
                  borderRadius: 5,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <span className="tiny">color theme</span>
        <p
          className="ui"
          style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--ink-faint)',
            lineHeight: 1.4,
          }}
        >
          Recolors the Rule of 3 and task accents. Picks are saved per device.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 4,
          }}
        >
          {(Object.values(ACCENT_PALETTES) as Array<typeof ACCENT_PALETTES[AccentPalette]>).map(
            (p) => {
              const active = p.id === accent;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setAccent(p.id)}
                  className="col wobble transition-colors hover:bg-paper-warm"
                  style={{
                    border: `1.6px solid ${active ? 'var(--terra-deep)' : 'var(--ink-soft)'}`,
                    background: active ? 'var(--terra-tint)' : 'var(--paper)',
                    borderRadius: 6,
                    padding: '12px 14px',
                    gap: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  aria-pressed={active}
                >
                  <div className="row items-center" style={{ gap: 6 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: p.swatches[0],
                        border: '1px solid rgba(28,24,20,0.25)',
                      }}
                    />
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: p.swatches[1],
                        border: '1px solid rgba(28,24,20,0.25)',
                      }}
                    />
                    <span
                      className="ui-b"
                      style={{
                        fontSize: 14,
                        marginLeft: 4,
                        color: active ? 'var(--terra-deep)' : 'var(--ink)',
                      }}
                    >
                      {p.label}
                    </span>
                  </div>
                  <p
                    className="ui"
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-faint)',
                      lineHeight: 1.35,
                      margin: 0,
                    }}
                  >
                    {p.description}
                  </p>
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

// ── Panel: deep-link card ──────────────────────────────────────────────

interface DeepLinkPanelProps {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}

function DeepLinkPanel({ title, description, buttonLabel, onClick }: DeepLinkPanelProps) {
  return (
    <div className="col" style={{ gap: 16 }}>
      <PanelHeading title={title} />
      <p
        className="ui"
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--ink-soft)',
          margin: 0,
          maxWidth: 480,
        }}
      >
        {description}
      </p>
      <div>
        <SettingButton onClick={onClick}>{buttonLabel}</SettingButton>
      </div>
    </div>
  );
}

// ── Panel: About ───────────────────────────────────────────────────────

function AboutPanel() {
  return (
    <div className="col" style={{ gap: 14 }}>
      <PanelHeading title="About" />
      <p
        className="hand"
        style={{
          fontSize: 18,
          lineHeight: 1.4,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        Sunflower — a slow, paper-textured productivity dashboard.
      </p>
      <p
        className="ui"
        style={{
          fontSize: 13,
          color: 'var(--ink-faint)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        Built with Next.js + Supabase + Dexie. Local-first; changes sync when you&apos;re online.
      </p>
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────

function PanelHeading({ title }: { title: string }) {
  return (
    <h3
      className="hand"
      style={{
        fontSize: 24,
        lineHeight: 1.1,
        fontWeight: 600,
        margin: 0,
        color: 'var(--ink)',
      }}
    >
      <span className="underline-hand">{title}</span>
    </h3>
  );
}

interface RowProps {
  label: string;
  description?: string;
  action?: React.ReactNode;
}

function Row({ label, description, action }: RowProps) {
  return (
    <div
      className="row items-start justify-between"
      style={{
        gap: 18,
        paddingBottom: 12,
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
        <span
          className="ui-b"
          style={{ fontSize: 13, color: 'var(--ink)' }}
        >
          {label}
        </span>
        {description && (
          <span
            className="ui"
            style={{
              fontSize: 12,
              color: 'var(--ink-faint)',
              lineHeight: 1.4,
            }}
          >
            {description}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function SettingButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui wobble hover:bg-paper-warm transition-colors"
      style={{
        border: '1.5px solid var(--ink-soft)',
        background: 'var(--paper)',
        color: 'var(--ink)',
        padding: '6px 12px',
        borderRadius: 5,
        fontSize: 12,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
