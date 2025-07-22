// --- Silence mapbox-gl in jsdom test env -------------
jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {},
  Map: function () {
    return {
      on: jest.fn(),
      getBounds: () => ({
        getSouth: () => 0,
        getWest: () => 0,
        getNorth: () => 0,
        getEast: () => 0,
      }),
      getZoom: () => 10,
      remove: jest.fn(),
    };
  },
}));