export function cssHsl(varName: string, fallbackHsl: string) {
  if (typeof window === 'undefined') return `hsl(${fallbackHsl})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return `hsl(${raw || fallbackHsl})`;
}

export function cssHslaVar(varName: string, fallbackTriple: string, alpha: number) {
  if (typeof window === 'undefined') return `hsl(${fallbackTriple} / ${alpha})`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return `hsl(${raw || fallbackTriple} / ${alpha})`;
}