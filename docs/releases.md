# Releases, tags, and npm versions

Sunflower uses three loosely-coupled version handles. This page explains
what each one is and how they stay in sync.

## The three handles

| Handle | Where it lives | What it does |
|---|---|---|
| **npm version** | `package.json` `"version"` | What the running app shows ("v2.5.0" under the day counter in the FlowerCard). Source of truth. |
| **git tag** | `refs/tags/v2.5.0` | A commit pointer. Used by CI to identify a release commit. |
| **GitHub Release** | `gh release create v2.5.0` | A GitHub-only page with auto-generated release notes and a downloadable source archive. |

## Flow on every merge to main

1. A PR is merged into `main` with a `package.json` version bump.
2. `.github/workflows/auto-tag.yml` reads the new version, creates a
   matching `vX.Y.Z` tag, and pushes it.
3. The same workflow runs `gh release create $TAG --generate-notes` to
   create a GitHub Release page with bullet-style notes derived from the
   merged PR titles.
4. Vercel deploys the new commit independently.

The drop-label convention (v2.1, v2.2, v2.3, v2.3.1, v2.4.0, v2.5.0)
matches the npm `version` field exactly. Older drops drifted because the
workflow used to strip trailing `.0` — that behavior was removed in v2.4.0.

## How to cut a new version

For a normal feature drop:

```bash
# in the feature branch
npm version 2.5.0 --no-git-tag-version    # bumps package.json + package-lock.json
git add package.json package-lock.json
git commit -m "chore: bump to 2.5.0"
# open PR, merge — the workflow handles the tag + release
```

For a hotfix on the same minor:

```bash
npm version 2.5.1 --no-git-tag-version
```

## What the user sees

- FlowerCard footer: `v2.5.0` (next to the Day counter).
- Settings → About: `Version 2.5.0`.
- Both render `APP_VERSION_DISPLAY` from `lib/version.ts`, which reads
  directly from `package.json`. There is no other version literal in the
  source tree.

## Browsing past releases

Each release page on GitHub
(`https://github.com/FriedTofuz/dashboard/releases/tag/v2.5.0`) shows the
auto-generated changelog. For a quick local browse, `git log --oneline`
between tags is enough.
