/* Hides noisy console.error lines in Lovable preview (extensions, device-mode SDK timeouts).
   Does not run in production or local host unless you opt in. */

const isPreviewHost =
  typeof window !== 'undefined' &&
  (/\bid-preview--/.test(window.location.hostname) ||
   /\.lovable\.dev$/.test(window.location.hostname) ||
   /\.lovable\.app$/.test(window.location.hostname));

if (isPreviewHost && typeof console !== 'undefined') {
  const PASS = console.error;
  const noisy = [
    /origins don't match/i,
    /DeviceModeDestinationsPlugin/i,
    /failed to load the script with id/i,
  ];
  console.error = function (...args: any[]) {
    const first = args?.[0]?.toString?.() ?? '';
    if (noisy.some(re => re.test(first))) return; // ignore
    return PASS.apply(console, args as any);
  };
  console.info('[console] preview filter active');
}

export {};