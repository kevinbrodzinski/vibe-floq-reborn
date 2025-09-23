// Token shim for native: map design tokens once, then use everywhere.
// If you already expose Tamagui tokens, swap these values to read from there.
export const colors = {
  background: '#0a0a0f',
  card: '#10121a',
  border: 'rgba(255,255,255,0.12)',
  primary: '#667eea',
  primaryFg: '#ffffff',
  muted: '#141824',
  mutedFg: 'rgba(255,255,255,0.6)',
  destructive: '#ef4444',
};

export const shadows = {
  lg: 'rgba(102,126,234,0.15)', // used only where RN supports shadowColor, see platform checks
};

export const radius = {
  xl: 22,
};

export const spacing = {
  pageX: 16,
};