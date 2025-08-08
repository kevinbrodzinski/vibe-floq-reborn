// src/lib/logger.ts
export const flags = {
  threads: localStorage.getItem('debug:threads') === '1',
  realtime: localStorage.getItem('debug:realtime') === '1',
};

export function dlog(cat: keyof typeof flags, ...args: any[]) {
  if (import.meta.env.DEV && flags[cat]) {
    // eslint-disable-next-line no-console
    console.log(`[${cat}]`, ...args);
  }
}