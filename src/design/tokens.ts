import { tokens as rawTokens } from "../../packages/tokens";

// Re-export with backwards-compatible structure
export const tokens = {
  color: {
    bg: '#0b1220',
    bgAlt: '#161f34',
    ink: '#f8fafc',
    subInk: 'rgba(248,250,252,0.75)',
    accent: '#9b87f5',
    accentAlt: '#ec4899',
    chipBg: 'rgba(255,255,255,0.08)',
    chipInk: '#ffffff',
    border: 'rgba(255,255,255,0.12)',
    success: '#34d399',
    warn: '#f59e0b',
    danger: '#ef4444',
  },
  radius: rawTokens.radius,
  shadow: rawTokens.shadow,
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  type: {
    family: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial`,
    size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, hero: 32 },
    weight: { reg: 400, med: 500, sem: 600, bold: 700 },
  },
} as const;

// Export raw tokens for Tailwind config
export { rawTokens };
