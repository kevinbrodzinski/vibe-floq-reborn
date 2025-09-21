// Disable device-mode analytics in Lovable preview to avoid 10s timeouts / noisy console.
// This runs early and stubs window.rudderanalytics if we detect an id-preview host
// or the explicit env toggle VITE_DISABLE_ANALYTICS=1.

declare global {
  interface Window {
    rudderanalytics?: any;
  }
}

const isPreviewHost =
  typeof window !== 'undefined' &&
  /(^|\.)id-preview--/.test(window.location.hostname);

const disabledByEnv =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env &&
  (import.meta as any).env.VITE_DISABLE_ANALYTICS === '1';

if (isPreviewHost || disabledByEnv) {
  const ra: any = [];
  // no-op methods expected by apps
  const methods = ['load','page','track','identify','group','alias','reset','ready','flush'];
  for (const m of methods) ra[m] = () => {};
  // attach to window so later code that references it does not crash
  window.rudderanalytics = ra;
  // optional: one-line log so we know it's active
  if (typeof console !== 'undefined') {
    console.info('[analytics] device-mode disabled in preview');
  }
}

export {}; // make it a module