/** @type {import('next').NextConfig} */

// v2.5 — security headers. Applied to every route by `source: '/(.*)'`.
//
// CSP allows 'unsafe-inline' / 'unsafe-eval' on script-src because Next 14's
// inline bootstrap and Tailwind JIT both need them; switching to nonce-based
// CSP would require a middleware refactor and is deferred. Even so, locking
// `connect-src` to self + the Supabase domain and setting `frame-ancestors
// 'none'` shuts off the most common injection-exfiltration paths.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src  'self' 'unsafe-inline'",
  "img-src    'self' data: blob: https:",
  "font-src   'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy',   value: CSP },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
