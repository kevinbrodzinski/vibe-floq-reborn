// Layer registry for DOM/PIXI hybrid z-index management
export const LAYER_REGISTRY = {
  friendPresence: { zDom: 320, zPixi: 50, minZoom: 14 },
  energyFlows:    { zDom: 0,   zPixi: 10, minZoom: 12 },
  venueStatus:    { zDom: 320, zPixi: 0,  minZoom: 15 },
  ghostTrails:    { zDom: 0,   zPixi: 40, minZoom: 16, enabled: false },
  predictions:    { zDom: 0,   zPixi: 60, minZoom: 14, enabled: false },
  weatherOverlay: { zDom: 320, zPixi: 0,  maxZoom: 14 },
  livePlans:      { zDom: 320, zPixi: 80, minZoom: 14 },
  publicEvents:   { zDom: 320, zPixi: 0,  minZoom: 13, enabled: false },
  priceZones:     { zDom: 320, zPixi: 0,  minZoom: 13, enabled: false },
  discoveryMode:  { zDom: 320, zPixi: 90, minZoom: 13, enabled: false },
} as const;

// PIXI container z-index assignments  
export const PIXI_Z_INDEX = {
  pressure: 10,   // flows/pressure
  winds: 20,      // wind arrows
  storms: 30,     // storms/lightning
  precip: 35,     // precipitation
  trails: 40,     // particle trails
  cascade: 90,    // proximity ripple
  compass: 95,    // vibe compass
} as const;