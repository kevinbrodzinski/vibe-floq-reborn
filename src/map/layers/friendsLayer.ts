import { AnyLayer } from 'mapbox-gl';

/** Renders friend dots on the map with vibe-based colors */
export const friendsLayer: AnyLayer = {
  id: 'friends-pins',
  type: 'circle',
  source: 'people', // Same source as self layer
  filter: ['all',
    ['==', ['get', 'friend'], true], // Only show friends
    ['!=', ['get', 'me'], true]      // Exclude self (handled by separate layer)
  ],
  paint: {
    'circle-radius': [
      'case',
      // Slightly larger for friends to make them prominent
      ['==', ['get', 'friend'], true], 8,
      6 // fallback
    ],
    'circle-color': [
      'case',
      // Vibe-based colors (consistent with floq colors)
      ['==', ['get', 'vibe'], 'social'], '#059669',    // Green
      ['==', ['get', 'vibe'], 'hype'], '#DC2626',      // Red  
      ['==', ['get', 'vibe'], 'curious'], '#7C3AED',   // Purple
      ['==', ['get', 'vibe'], 'chill'], '#2563EB',     // Blue
      ['==', ['get', 'vibe'], 'solo'], '#0891B2',      // Cyan
      ['==', ['get', 'vibe'], 'romantic'], '#EC4899',  // Pink
      ['==', ['get', 'vibe'], 'weird'], '#F59E0B',     // Orange
      ['==', ['get', 'vibe'], 'down'], '#6B7280',      // Gray
      ['==', ['get', 'vibe'], 'flowing'], '#10B981',   // Emerald
      ['==', ['get', 'vibe'], 'open'], '#84CC16',      // Lime
      '#10B981' // Default friend green
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FFFFFF',
    'circle-opacity': 0.9,
    'circle-stroke-opacity': 1
  }
};