export function safePostMessage(target: Window, msg: unknown, origin: string) {
  try {
    if (origin === '*' || origin === window.origin) target.postMessage(msg, origin);
  } catch (e) {
    if (import.meta.env.DEV) console.debug('[DevBridge] postMessage suppressed', { origin, e });
  }
}