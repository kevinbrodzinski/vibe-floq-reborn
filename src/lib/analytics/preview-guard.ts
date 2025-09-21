/* Disable device-mode analytics in Lovable preview (or when VITE_DISABLE_ANALYTICS=1),
   so third-party loaders (FB/TikTok/GA/Ads/GTM) don't spam or time out. */

declare global {
  interface Window {
    rudderanalytics?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const isPreviewHost =
  typeof window !== 'undefined' &&
  (/\bid-preview--/.test(window.location.hostname) ||
   /\.lovable\.dev$/.test(window.location.hostname) ||
   /\.lovable\.app$/.test(window.location.hostname));

const disabledByEnv =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.VITE_DISABLE_ANALYTICS === '1';

if (isPreviewHost || disabledByEnv) {
  const ra: any = [];
  ['load','page','track','identify','group','alias','reset','ready','flush'].forEach(
    m => (ra[m] = () => {})
  );
  window.rudderanalytics = ra;  // RudderStack device-mode noop
  window.dataLayer = [];        // GTM noop
  window.gtag = () => {};       // gtag noop
  if (typeof console !== 'undefined') {
    console.info('[analytics] disabled in Lovable preview');
  }
}

export {};