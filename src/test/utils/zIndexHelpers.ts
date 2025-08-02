/* ------------------------------------------------------------------
   Z-index test helpers
   ------------------------------------------------------------------ */

import { Z } from '@/constants/z';

/* ---------- Types ---------- */
export interface LayerTest {
  selector: string;           // CSS selector used in test
  expectedLayer: keyof typeof Z;
  minZIndex: number;          // sanity threshold
}

/* ---------- Basic helpers ---------- */
export const getZIndex = (selector: string): number => {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return 0;

  const zStr = window.getComputedStyle(el).zIndex;
  const parsed = parseInt(zStr, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const validateLayerHierarchy = (
  upperSelector: string,
  lowerSelector: string
): boolean => getZIndex(upperSelector) > getZIndex(lowerSelector);

/* ---------- Scenario catalogue ---------- */
export const LAYER_TEST_SCENARIOS: LayerTest[] = [
  {
    selector: '[data-testid="toast"]',
    expectedLayer: 'toast',
    minZIndex:    Z.toast
  },
  {
    selector: '[role="dialog"]',
    expectedLayer: 'modal',
    minZIndex:    Z.modal
  },
  {
    selector: '[data-testid="floating-bottom-bar"]',
    expectedLayer: 'system',
    minZIndex:    Z.system
  },
  {
    selector: '[data-testid="banner"]',
    expectedLayer: 'banner',
    minZIndex:    Z.banner
  },
  {
    selector: 'nav',
    expectedLayer: 'navigation',
    minZIndex:    Z.navigation
  }
];

/* ---------- Batch validator (handy in e2e) ---------- */
export const validateAllLayers = (): boolean =>
  LAYER_TEST_SCENARIOS.every(({ selector, minZIndex, expectedLayer }) => {
    const actual = getZIndex(selector);
    if (actual < minZIndex) {
      // eslint-disable-next-line no-console
      console.error(
        `[z-index] ${expectedLayer} => ${actual} (expected ≥ ${minZIndex})`
      );
      return false;
    }
    return true;
  });

/* ---------- Critical interaction checks ---------- */
export const CRITICAL_INTERACTIONS = [
  {
    name: 'Toast over Modal',
    test: () =>
      validateLayerHierarchy('[data-testid="toast"]', '[role="dialog"]')
  },
  {
    name: 'Modal over Navigation',
    test: () => validateLayerHierarchy('[role="dialog"]', 'nav')
  },
  {
    name: 'Dropdown over Modal',
    test: () => validateLayerHierarchy('[role="menu"]', '[role="dialog"]')
  },
  {
    name: 'System FAB over Banner',
    test: () =>
      validateLayerHierarchy(
        '[data-testid="floating-bottom-bar"]',
        '[data-testid="banner"]'
      )
  }
];

/* Re-export for convenience so tests can do `import { Z } from './zIndexTestUtils'` */
export { Z as zIndex };