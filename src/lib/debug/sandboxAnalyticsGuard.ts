// Silence dev analytics in sandbox to keep logs readable
if (typeof window !== 'undefined' && /sandbox\.lovable\.dev$/.test(location.host)) {
  // Disable PostHog in sandbox
  if ((window as any).posthog) {
    (window as any).posthog.capture = () => {};
    (window as any).posthog.identify = () => {};
    (window as any).posthog.track = () => {};
  }
  
  console.info('[Sandbox] Analytics disabled for cleaner logs');
}
