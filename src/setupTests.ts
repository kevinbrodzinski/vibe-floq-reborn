// Jest setup file for testing configuration
import '@testing-library/jest-dom';

// Mock mapbox-gl to prevent jsdom errors  
const mockMap = {
  on: () => {},
  off: () => {},
  addControl: () => {},
  removeControl: () => {},
  getBounds: () => ({
    getSouth: () => 34.0,
    getWest: () => -118.3,
    getNorth: () => 34.1,
    getEast: () => -118.2,
  }),
  getZoom: () => 10,
  getCenter: () => ({ lng: -118.25, lat: 34.05 }),
  remove: () => {},
  resize: () => {},
  setStyle: () => {},
  flyTo: () => {},
  easeTo: () => {},
};

// Check if we're in a test environment before mocking
if (typeof window !== 'undefined' && (window as any).jest) {
  (window as any).mapboxgl = {
    Map: function() { return mockMap; },
    NavigationControl: function() { return {}; },
    accessToken: 'pk.test',
  };
}

// Mock browser APIs for testing
if (typeof window !== 'undefined') {
  // Mock IntersectionObserver
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];
      takeRecords() { return []; }
    } as any;
  }

  // Mock ResizeObserver
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }
}