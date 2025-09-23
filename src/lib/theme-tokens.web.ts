// Token shim for web: return CSS variables so Tailwind/shadcn themes drive colors.
export const colors = {
  background: 'hsl(var(--background))',
  card: 'hsl(var(--card))',
  border: 'hsl(var(--border))',
  primary: 'hsl(var(--primary))',
  primaryFg: 'hsl(var(--primary-foreground))',
  muted: 'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  destructive: 'hsl(var(--destructive))',
};

export const shadows = {
  lg: '0 10px 30px hsl(var(--primary) / 0.15)',
};

export const radius = {
  xl: 22,
};

export const spacing = {
  pageX: 16,
};