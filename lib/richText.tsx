import React from 'react';

/**
 * Render a string with two link forms supported:
 *   1. Markdown style: [label](https://example.com)
 *   2. Bare URLs:      https://example.com
 *
 * Markdown links are extracted first so the URL inside them isn't re-parsed
 * by the bare-URL pass. Any non-link text is returned as plain strings so
 * the parent's existing `white-space: pre-line` keeps working.
 *
 * Anchors stop pointer propagation so they don't trigger row-level handlers
 * (drag, single-click move prompts, double-click open editor).
 */

const MD_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL_RE = /(https?:\/\/[^\s)]+)/g;

function renderBareUrls(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(BARE_URL_RE);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // captured URL
      return (
        <a
          key={`${keyPrefix}-u-${i}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            color: 'var(--sage-deep)',
            textDecoration: 'underline',
            textDecorationThickness: '1px',
            textUnderlineOffset: '2px',
            wordBreak: 'break-word',
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function renderRichText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // Reset regex state since we're using a /g pattern as a stateful reader.
  MD_LINK_RE.lastIndex = 0;

  while ((match = MD_LINK_RE.exec(text)) !== null) {
    const [whole, label, url] = match;
    if (match.index > lastIndex) {
      nodes.push(...renderBareUrls(text.slice(lastIndex, match.index), `pre-${match.index}`));
    }
    nodes.push(
      <a
        key={`md-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          color: 'var(--sage-deep)',
          textDecoration: 'underline',
          textDecorationThickness: '1px',
          textUnderlineOffset: '2px',
        }}
      >
        {label}
      </a>,
    );
    lastIndex = match.index + whole.length;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderBareUrls(text.slice(lastIndex), `tail-${lastIndex}`));
  }

  return <>{nodes}</>;
}
