# Sunflower

A local-first personal productivity dashboard. Next.js 14 App Router on the
front, Supabase for cloud sync and auth, Dexie/IndexedDB for the offline
store.

## Quick start

```bash
cp .env.local.example .env.local   # fill in Supabase + VAPID keys
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Project layout

```
app/                Next.js 14 App Router (pages, API routes, auth callbacks)
components/         React components, grouped by area (tasks, system, layout, etc.)
lib/
  crypto/           AES-GCM helpers for card encryption
  idb/              Dexie schema, sync queue, per-table helpers
  store/            Zustand stores
  supabase/         Browser + server clients
  validation/       Length-cap source of truth
public/             Static assets + PWA manifest
supabase/migrations/ Numbered SQL migrations (0001 → 0009)
docs/
  security.md      Threat model + recovery flow
  releases.md      Version / tag / release flow
  design/          v2 design handoff prototype + visual spec
.github/workflows/  Auto-tag + GitHub Release on merge to main
```

## Versioning

`package.json`'s `version` field is the single source of truth.
`lib/version.ts` re-exports it as `APP_VERSION_DISPLAY` so every place
that shows the version reads the same string. The full release flow is
documented in [`docs/releases.md`](docs/releases.md).

## Security

The security model — what's encrypted, the recovery code flow, and what is
intentionally out of scope — lives in [`docs/security.md`](docs/security.md).
