/**
 * Centralized map layer and source IDs
 * Prevents typos and makes refactoring easier
 */

// User aura system
export const SRC_USER_AURA   = 'user-aura';
export const LYR_USER_AURA_OUTER = 'user-aura-outer';
export const LYR_USER_AURA_INNER = 'user-aura-inner'; 
export const LYR_USER_AURA_DOT   = 'user-aura-dot';
export const LYR_USER_AURA_HIT   = 'user-aura-hit';

// Standard before layers for consistent ordering
export const BEFORE_SYMBOLS  = 'road-label'; // Mapbox default symbol layer
export const BEFORE_POI      = 'poi-label';  // POI labels layer
export const AURA_BEFORE     = 'poi-label';  // Stable anchor for aura layers