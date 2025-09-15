/**
 * Resolve Tailwind-style HSL CSS vars (e.g., --background = "230 35% 7%")
 * into real color strings usable by Mapbox ("hsl(230 35% 7%)").
 * Falls back to the supplied fallbackHsl if not found.
 */
export function hslVar(varName: string, fallbackHsl: string): string {
  if (typeof window === 'undefined') return fallbackHsl;
  try {
    const root = document.documentElement;
    const raw = getComputedStyle(root).getPropertyValue(varName).trim();
    if (!raw) return fallbackHsl;

    // If already a full color string (e.g., "hsl(...)" or hex), return as-is
    if (/^(hsl|hsla|rgb|rgba)\(/i.test(raw) || /^#([0-9a-f]{3,8})$/i.test(raw)) {
      return raw;
    }

    // Tailwind HSL form is usually "H S% L%" — preserve spaces to keep modern CSS HSL syntax
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    return `hsl(${cleaned})`;
  } catch {
    return fallbackHsl;
  }
}

/**
 * Re-run handler on likely theme changes (class toggles, data-theme, prefers-color-scheme).
 */
export function onThemeChange(handler: () => void) {
  if (typeof window === 'undefined') return () => {};
  
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  const mediaListener = () => handler();

  // Observe class / data-theme / style on <html>
  const attrObserver = new MutationObserver(handler);
  attrObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style'],
  });

  mql?.addEventListener?.('change', mediaListener);

  return () => {
    try { mql?.removeEventListener?.('change', mediaListener); } catch {}
    try { attrObserver.disconnect(); } catch {}
  };
}
