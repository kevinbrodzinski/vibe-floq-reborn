export function safeTrack(event: string, props?: Record<string, any>) {
  try {
    // your analytics wrapper
    // track(event, props);
  } catch {}
}