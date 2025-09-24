// Vibe color utilities for Mapbox layers
// Converts vibe colors to RGBA strings that Mapbox can understand

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').trim();
  const n = m.length === 3
    ? m.split('').map((c) => c + c).join('')
    : m;
  const num = parseInt(n, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert hex color to RGBA string with alpha
 */
export function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Read CSS variable --vibe-hex (set by useVibeEngine) and return RGBA string
 * This avoids using CSS vars inside Mapbox which can cause issues
 */
export function vibeRgba(alpha: number, fallbackHex = '#22d3ee'): string {
  if (typeof window === 'undefined') return rgbaFromHex(fallbackHex, alpha);
  
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--vibe-hex')
      .trim();
    const hex = raw || fallbackHex;
    return rgbaFromHex(hex, alpha);
  } catch {
    return rgbaFromHex(fallbackHex, alpha);
  }
}