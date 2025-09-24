export function onIdle(fn: () => void, timeout = 600) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = (window as any).requestIdleCallback(fn, { timeout });
    return () => (window as any).cancelIdleCallback?.(id);
  }
  const t = setTimeout(fn, timeout);
  return () => clearTimeout(t);
}