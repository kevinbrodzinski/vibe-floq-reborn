/**
 * Centralized Mapbox configuration
 */

export const MAPBOX_CONFIG = {
  // FLOQ Labs custom style
  STYLE_URL: 'mapbox://styles/floqlabs/cmg26ul83002s01ps5whu9vve',
  
  // Fallback to default dark if custom style fails
  FALLBACK_STYLE: 'mapbox://styles/mapbox/dark-v11',
  
  // Public token (safe to store in codebase)
  PUBLIC_TOKEN: 'pk.eyJ1IjoiZmxvcWxhYnMiLCJhIjoiY21kZ3ZubTNiMHBrOTJyb3BoaG44a2tlbyJ9.fkkKFF_o-bjpgcVJav1pzw',
} as const;

/**
 * Get the appropriate Mapbox style URL
 */
export function getMapboxStyle(): string {
  return MAPBOX_CONFIG.STYLE_URL;
}

/**
 * Get the public Mapbox token
 */
export function getMapboxPublicToken(): string {
  return MAPBOX_CONFIG.PUBLIC_TOKEN;
}