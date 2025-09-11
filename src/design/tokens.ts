export const tokens = {
  color: {
    bg:        '#0b1220',        // panel background (dark)
    bgAlt:     '#161f34',
    ink:       '#f8fafc',        // primary text on dark
    subInk:    'rgba(248,250,252,0.75)',
    accent:    '#9b87f5',        // brand indigo
    accentAlt: '#ec4899',        // brand pink
    chipBg:    'rgba(255,255,255,0.08)',
    chipInk:   '#ffffff',
    border:    'rgba(255,255,255,0.12)',
    success:   '#34d399',
    warn:      '#f59e0b',
    danger:    '#ef4444',
  },
  radius: { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 },
  shadow: {
    soft:  '0 6px 18px rgba(0,0,0,0.35)',
    glow:  '0 0 24px rgba(236,72,153,0.35)',
    focus: '0 0 0 3px rgba(255,255,255,0.6)',
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  type: {
    family: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial`,
    size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, hero: 32 },
    weight: { reg: 400, med: 500, sem: 600, bold: 700 },
  },
} as const;