// Safe default if env missing
export const PATTERNS_ENABLED =
  (import.meta as any).env?.VITE_VIBE_PATTERNS !== 'off';