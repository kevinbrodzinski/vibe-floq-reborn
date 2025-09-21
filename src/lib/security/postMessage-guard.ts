/**
 * Preview-only postMessage firewall + helper.
 * - Drops untrusted cross-origin message events in Lovable preview (capture phase).
 * - Keeps a strict allow-list (self + Lovable preview hosts).
 * - Provides allowedMessageOrigin() to use in your own event handlers.
 *
 * Add extra allowed origins via: VITE_ALLOWED_MESSAGE_ORIGINS="https://lovable.dev,https://example.com"
 */

type Allow = string | RegExp | (() => string);

const isPreview =
  typeof window !== 'undefined' &&
  (/\bid-preview--/.test(window.location.hostname) || /\.lovable\.(dev|app|project)$/.test(window.location.hostname));

function envAllowed(): string[] {
  const raw =
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_ALLOWED_MESSAGE_ORIGINS;
  return raw ? String(raw).split(',').map(s => s.trim()).filter(Boolean) : [];
}

const RULES: Allow[] = [
  () => window.location.origin,                                           // self
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.(dev|app|project)$/,       // Lovable preview shell
  /^https:\/\/(www\.)?lovable\.dev$/,                                      // wrapper root (sometimes posts)
  ...envAllowed(),
];

export function allowedMessageOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  for (const r of RULES) {
    if (typeof r === 'function' && origin === r()) return true;
    if (typeof r === 'string'   && origin === r)  return true;
    if (r instanceof RegExp     && r.test(origin)) return true;
  }
  return false;
}

// Preview-only firewall: stop noisy cross-origin messages BEFORE your app sees them
if (isPreview && typeof window !== 'undefined') {
  window.addEventListener('message', (e: MessageEvent) => {
    if (!e.isTrusted || !allowedMessageOrigin(e.origin)) {
      // silently drop to avoid "origins don't match" spam
      e.stopImmediatePropagation();
    }
  }, { capture: true });

  console.info?.('[security] postMessage guard active (preview only)');
}