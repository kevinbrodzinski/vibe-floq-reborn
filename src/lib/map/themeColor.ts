let _cache: Record<string, string> = {};
let _cacheStamp = 0;

export function invalidateThemeColorCache() {
  _cache = {};
  _cacheStamp = Date.now();
}

// Handle early CSS var access on SSR hydration or very early mount
if (typeof document !== 'undefined' && document.readyState !== 'complete') {
  document.addEventListener('DOMContentLoaded', () => {
    invalidateThemeColorCache();
  }, { once: true });
}

/**
 * Mapbox GL **does not** support CSS Color 4 space-separated HSL.
 * It expects the legacy comma form: hsl(H, S%, L%) or hsla(H, S%, L%, A).
 * This converts "230 35% 7%" or "230 35% 7% / 0.6" -> legacy strings.
 */
function normalizeHslTokenLegacy(token: string): string {
  const [core, alpha] = token.split('/').map(s => s.trim());
  const hsl = core.split(/\s+/);
  const [H, S, L] = [hsl[0], hsl[1], hsl[2]];
  if (!H || !S || !L) return '#ffffff';
  return (alpha && alpha.length)
    ? `hsla(${H}, ${S}, ${L}, ${alpha})`
    : `hsl(${H}, ${S}, ${L})`;
}

/**
 * Resolve Tailwind-style HSL CSS vars (e.g., --background = "230 35% 7%")
 * into real color strings usable by Mapbox ("hsl(230 35% 7%)").
 * Falls back to the supplied fallbackHsl if not found.
 */
export function hslVar(varName: string, fallbackHsl: string): string {
  if (typeof window === 'undefined') return fallbackHsl;
  const k = `${_cacheStamp}:${varName}`;
  if (_cache[k]) return _cache[k];

  try {
    const root = document.documentElement;
    const raw = getComputedStyle(root).getPropertyValue(varName).trim();
    if (!raw) return (_cache[k] = fallbackHsl);

    // If already a full color string (e.g., "hsl(...)" or hex), return as-is
    if (/^(hsl|hsla|rgb|rgba)\(/i.test(raw) || /^#([0-9a-f]{3,8})$/i.test(raw)) {
      return (_cache[k] = raw);
    }

    // Tailwind HSL form is usually "H S% L%" — preserve spaces to keep modern CSS HSL syntax
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    return (_cache[k] = normalizeHslTokenLegacy(cleaned));
  } catch {
    return (_cache[k] = fallbackHsl);
  }
}

/**
 * Re-run handler on likely theme changes (class toggles, data-theme, prefers-color-scheme).
 */
export function onThemeChange(handler: () => void) {
  if (typeof window === 'undefined') return () => {};
  
  let raf = 0;
  const run = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      invalidateThemeColorCache();
      handler();
    });
  };

  const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
  const mediaListener = run;

  // Observe class / data-theme / style on <html>
  const attrObserver = new MutationObserver(run);
  attrObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style'],
  });

  mql?.addEventListener?.('change', mediaListener);

  return () => {
    try { mql?.removeEventListener?.('change', mediaListener); } catch {}
    try { attrObserver.disconnect(); } catch {}
    cancelAnimationFrame(raf);
  };
}

/**
 * Resolve HSL vars with separate alpha channel support
 */
export function hslVarWithAlpha(
  varHue: `--${string}`,
  varAlpha?: `--${string}`,
  fallbackHsl = 'hsl(210, 100%, 50%)'
) {
  // Resolve hue token then rebuild as legacy hsla with separate alpha var.
  const hueRaw = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(varHue).trim();
      return raw || null;
    } catch { return null; }
  })();

  const hue = hueRaw ? normalizeHslTokenLegacy(hueRaw.replace(/\s+/g,' ').trim()) : fallbackHsl;
  if (!varAlpha) return hue;

  try {
    const aRaw = getComputedStyle(document.documentElement).getPropertyValue(varAlpha).trim();
    if (!aRaw) return hue;
    // Convert hue -> hsla(H, S, L, A)
    const match = hue.match(/^hsl[a]?\(\s*([^,]+),\s*([^,]+),\s*([^) ,]+)(?:,\s*([^)]+))?\s*\)$/i);
    if (!match) return hue;
    const [, H, S, L] = match;
    return `hsla(${H}, ${S}, ${L}, ${aRaw})`;
  } catch { return hue; }
}
