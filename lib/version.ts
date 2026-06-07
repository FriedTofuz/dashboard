import pkg from '../package.json';

/** Single source of truth for the app's version string. Reads from
 *  `package.json` so we never have to update it in three places — the
 *  auto-tag workflow on main also derives the git tag from this same value. */
export const APP_VERSION: string = (pkg as { version: string }).version;

/** Pretty-printed "v2.4.0" form for UI display. */
export const APP_VERSION_DISPLAY = `v${APP_VERSION}`;
