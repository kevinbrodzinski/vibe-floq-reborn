// Minimal MyLocationLayer to fix build error
// This was referenced by VibeDensityMap.tsx but was missing

export const myLocationLayer = {
  id: 'my-location',
  type: 'circle' as const,
  source: 'my-location',
  paint: {
    'circle-radius': 8,
    'circle-color': '#3b82f6',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  }
};