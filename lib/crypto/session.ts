/**
 * In-memory CMK for the current Logbook session.
 *
 * The unwrapped Card Master Key lives here while the Logbook is unlocked
 * so that CardsBody can encrypt-on-write and decrypt-on-render without
 * re-deriving from the PIN every keystroke. It is *never* persisted to
 * disk, sessionStorage, or anywhere observable from outside this JS
 * module. Locking the Logbook (or any explicit clear() call) wipes it.
 *
 * Subscribers (the CardsBody render path) re-read this on every render.
 * We expose a tiny pub-sub so a fresh CMK after unlock triggers re-render.
 */

let _cmk: Uint8Array | null = null;
const listeners = new Set<() => void>();

function notify() {
  // Array.from avoids relying on Set iteration target levels.
  for (const cb of Array.from(listeners)) {
    try { cb(); } catch { /* listener errors are not our problem */ }
  }
}

export function setSessionCmk(cmk: Uint8Array | null): void {
  if (_cmk && _cmk !== cmk) {
    // Best-effort zero out the previous key bytes before dropping the
    // reference. (Doesn't affect Web Crypto's internal copies, but
    // doesn't hurt either.)
    _cmk.fill(0);
  }
  _cmk = cmk;
  notify();
}

export function getSessionCmk(): Uint8Array | null {
  return _cmk;
}

export function isUnlocked(): boolean {
  return _cmk !== null;
}

export function clearSessionCmk(): void {
  setSessionCmk(null);
}

/** Subscribe to CMK changes. Returns an unsubscribe fn. */
export function subscribeSessionCmk(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
