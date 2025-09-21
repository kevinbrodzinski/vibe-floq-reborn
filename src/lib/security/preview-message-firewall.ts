/* Blocks untrusted cross-origin postMessage noise in Lovable preview
   while preserving strict allow-list policy. Runs only in preview. */

type AllowRule = string | RegExp | (() => string);

const isPreviewHost =
  typeof window !== 'undefined' &&
  (/\bid-preview--/.test(window.location.hostname) ||
   /\.lovable\.dev$/.test(window.location.hostname) ||
   /\.lovable\.app$/.test(window.location.hostname));

function envAllowlist(): string[] {
  const raw =
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_ALLOWED_MESSAGE_ORIGINS;
  return raw ? String(raw).split(',').map(s => s.trim()).filter(Boolean) : [];
}

const DEFAULT_RULES: AllowRule[] = [
  () => window.location.origin,                                 // self
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.(app|project|dev)$/, // preview subdomains
  /^https:\/\/(www\.)?lovable\.dev$/,                           // wrapper root
  ...envAllowlist(),
];

function isAllowedOrigin(origin: string): boolean {
  for (const rule of DEFAULT_RULES) {
    if (typeof rule === 'string' && origin === rule) return true;
    if (rule instanceof RegExp && rule.test(origin)) return true;
    if (typeof rule === 'function' && origin === (rule as Function)()) return true;
  }
  return false;
}

if (isPreviewHost && typeof window !== 'undefined') {
  window.addEventListener(
    'message',
    (e: MessageEvent) => {
      if (!e.isTrusted || !e.origin) {
        e.stopImmediatePropagation();
        return;
      }
      if (!isAllowedOrigin(e.origin)) {
        // Drop silently to avoid console noise
        e.stopImmediatePropagation();
      }
    },
    { capture: true }
  );
  if (typeof console !== 'undefined') {
    console.info('[security] preview message firewall active');
  }
}

export {};