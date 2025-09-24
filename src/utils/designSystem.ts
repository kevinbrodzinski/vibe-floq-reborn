// Design System Utilities
// Common patterns for consistent styling across components

export const designSystem = {
  // Glass morphism panel
  panel: 'bg-[color:var(--bg-alt)] backdrop-blur border border-[color:var(--border)]',
  
  // Overlay backgrounds
  overlay: 'bg-[color:var(--bg)]/50 backdrop-blur-sm',
  overlayDark: 'bg-[color:var(--bg)]/80 backdrop-blur-sm',
  
  // Text colors
  text: {
    primary: 'text-[color:var(--ink)]',
    secondary: 'text-[color:var(--sub-ink)]',
    accent: 'text-[color:var(--accent)]',
  },
  
  // Interactive elements
  interactive: {
    chip: 'bg-[color:var(--chip-bg)] text-[color:var(--chip-ink)] hover:bg-white/15',
    chipPressed: 'bg-white/20 text-white',
  },
  
  // Borders and dividers
  border: 'border-[color:var(--border)]',
  
  // Shadows
  shadow: {
    soft: 'shadow-soft',
    glow: 'shadow-glow',
  },
  
  // Border radius
  radius: {
    sm: 'rounded-kit-sm',
    md: 'rounded-kit-md', 
    lg: 'rounded-kit-lg',
    xl: 'rounded-kit-xl',
    pill: 'rounded-kit-pill',
  }
} as const;

// Utility function to combine design system classes
export function ds(...classes: (keyof typeof designSystem | string)[]): string {
  return classes
    .map(cls => typeof cls === 'string' && cls in designSystem ? designSystem[cls as keyof typeof designSystem] : cls)
    .join(' ');
}