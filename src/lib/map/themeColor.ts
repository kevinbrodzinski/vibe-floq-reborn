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
 * Normalize HSL tokens to support both space and alpha syntax
 * Accepts "230 35% 7%" or "230 35% 7% / 0.6"
 */
function normalizeHslToken(token: string): string {
  const parts = token.split('/').map(s => s.trim());
  if (parts.length === 2) {
    return `hsl(${parts[0]} / ${parts[1]})`;
  }
  return `hsl(${token})`;
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
    return (_cache[k] = normalizeHslToken(cleaned));
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
export function hslVarWithAlpha(varHue: `--${string}`, varAlpha?: `--${string}`, fallbackHsl = 'hsl(210 100% 50%)') {
  const hue = hslVar(varHue, fallbackHsl); // returns full hsl(...) or converted token
  if (!varAlpha) return hue;
  
  try {
    const aRaw = getComputedStyle(document.documentElement).getPropertyValue(varAlpha).trim();
    if (!aRaw) return hue;
    // hue is like "hsl(230 35% 7%)" or "hsl(230 35% 7% / 0.6)"
    const body = hue.replace(/^hsl\(|\)$/g, '');
    const parts = body.split('/').map(s => s.trim());
    const core = parts[0];
    return `hsl(${core} / ${aRaw})`;
  } catch {
    return hue;
  }
}
