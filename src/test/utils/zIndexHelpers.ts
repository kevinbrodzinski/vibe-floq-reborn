
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
 * Works with both Cypress and Playwright
 */
export const getZIndex = async (selector: string): Promise<number> => {
  // For Cypress
  if (typeof cy !== 'undefined') {
    return cy.get(selector)
      .invoke('css', 'z-index')
      .then((zIndex) => parseInt(zIndex as string, 10) || 0);
  }
  
  // For Playwright (would need to be adapted for actual Playwright usage)
  const element = document.querySelector(selector);
  if (!element) return 0;
  
  const computed = window.getComputedStyle(element);
  return parseInt(computed.zIndex, 10) || 0;
};

/**
 * Validate that layer A appears above layer B
 */
export const validateLayerHierarchy = async (
  upperSelector: string,
  lowerSelector: string
): Promise<boolean> => {
  const upperZ = await getZIndex(upperSelector);
  const lowerZ = await getZIndex(lowerSelector);
  
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
export const validateAllLayers = async (): Promise<boolean> => {
  for (const scenario of LAYER_TEST_SCENARIOS) {
    try {
      const zIndex = await getZIndex(scenario.selector);
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
