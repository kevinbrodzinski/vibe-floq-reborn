/** Preview-only postMessage firewall + helper. */
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
  () => window.location.origin,
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.(dev|app|project)$/,
  /^https:\/\/(www\.)?lovable\.dev$/,
  ...envAllowed(),
];
export function allowedMessageOrigin(origin?: string | null) {
  if (!origin) return false;
  return RULES.some(r =>
    (typeof r === 'function' && origin === r()) ||
    (typeof r === 'string'   && origin === r)  ||
    (r instanceof RegExp     && r.test(origin))
  );
}
if (isPreview && typeof window !== 'undefined') {
  window.addEventListener('message', (e: MessageEvent) => {
    if (!e.isTrusted || !allowedMessageOrigin(e.origin)) e.stopImmediatePropagation();
  }, { capture: true });
  console.info?.('[security] postMessage guard active (preview only)');
}
export {};