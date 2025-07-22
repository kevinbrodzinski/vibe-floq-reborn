
/**
 * Test utilities for validating z-index hierarchy
 * Used in Cypress/Playwright tests to ensure proper layer stacking
 */

export interface LayerTest {
  selector: string;
  expectedLayer: string;
  minZIndex: number;
}

/**
 * Get computed z-index value for an element
 * Works in browser environment for testing
 */
export const getZIndex = (selector: string): number => {
  const element = document.querySelector(selector);
  if (!element) return 0;
  
  const computed = window.getComputedStyle(element);
  return parseInt(computed.zIndex, 10) || 0;
};

/**
 * Validate that layer A appears above layer B
 */
export const validateLayerHierarchy = (
  upperSelector: string,
  lowerSelector: string
): boolean => {
  const upperZ = getZIndex(upperSelector);
  const lowerZ = getZIndex(lowerSelector);
  
  return upperZ > lowerZ;
};

/**
 * Test scenarios for common z-index interactions
 */
export const LAYER_TEST_SCENARIOS: LayerTest[] = [
  {
    selector: '[data-testid="toast"]',
    expectedLayer: 'toast',
    minZIndex: 90
  },
  {
    selector: '[role="dialog"]',
    expectedLayer: 'modal',
    minZIndex: 70
  },
  {
    selector: '[data-testid="floating-bottom-bar"]',
    expectedLayer: 'system',
    minZIndex: 50
  },
  {
    selector: '[data-testid="banner"]',
    expectedLayer: 'overlay',
    minZIndex: 30
  },
  {
    selector: 'nav',
    expectedLayer: 'navigation',
    minZIndex: 60
  }
];

/**
 * Validate all layer scenarios
 */
export const validateAllLayers = (): boolean => {
  for (const scenario of LAYER_TEST_SCENARIOS) {
    try {
      const zIndex = getZIndex(scenario.selector);
      if (zIndex < scenario.minZIndex) {
        console.error(`Layer ${scenario.expectedLayer} has z-index ${zIndex}, expected >= ${scenario.minZIndex}`);
        return false;
      }
    } catch (error) {
      // Element not found is acceptable for some tests
      continue;
    }
  }
  
  return true;
};

/**
 * Critical interaction tests
 */
export const CRITICAL_INTERACTIONS = [
  {
    name: 'Toast over Modal',
    test: () => validateLayerHierarchy('[data-testid="toast"]', '[role="dialog"]')
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
    name: 'System FAB over Overlay',
    test: () => validateLayerHierarchy('[data-testid="floating-bottom-bar"]', '[data-testid="banner"]')
  }
];
