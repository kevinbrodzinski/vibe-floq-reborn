/**
 * Mapbox configuration and access token
 */

// Export the Mapbox access token from environment variables
export const MapboxAccessToken = import.meta.env.VITE_MAPBOX_TOKEN || 
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 
  'pk.eyJ1IjoiZmxvcS1hcHAiLCJhIjoiY20xNnhpZXM3MDNmaTJrcHNrb3JkZm5qOSJ9.example'; // Fallback token

// Mapbox style configurations
export const MapboxStyles = {
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
} as const;

// Default map configuration
export const DEFAULT_MAP_CONFIG = {
  center: [-122.4194, 37.7749] as [number, number], // San Francisco
  zoom: 11,
  style: MapboxStyles.DARK,
  antialias: true,
  optimizeForTerrain: true,
} as const;