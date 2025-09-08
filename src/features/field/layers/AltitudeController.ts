/**
 * Altitude Controller - Semantic zoom layer management
 * Maps zoom levels to atmospheric "bands" that control layer visibility
 */

type Band = { 
  name: string; 
  on: Set<string>; 
  range: [number, number] 
};

const bands: Band[] = [
  { 
    name: 'stratosphere', 
    range: [10, 13], 
    on: new Set(['AtmoTint', 'Pressure']) 
  },
  { 
    name: 'mesosphere', 
    range: [13, 15], 
    on: new Set(['Pressure', 'Winds', 'Storms']) 
  },
  { 
    name: 'troposphere', 
    range: [15, 17], 
    on: new Set(['Winds', 'Storms', 'Lanes', 'Lightning']) 
  },
  { 
    name: 'ground', 
    range: [17, 22], 
    on: new Set(['Lanes', 'Breathing', 'Lightning', 'Precip']) 
  },
];

export interface LayerState {
  enabled: boolean;
  alpha: number;
  fadingIn: boolean;
  fadingOut: boolean;
}

export class AltitudeController {
  private currentBand: Band | null = null;
  private layerStates = new Map<string, LayerState>();
  private fadeSpeed = 0.08; // Alpha change per frame
  
  /**
   * Get active layers for current zoom level
   */
  computeActiveLayers(zoom: number): Set<string> {
    const band = bands.find(b => zoom >= b.range[0] && zoom < b.range[1]) ?? bands[0];
    
    // Trigger layer transitions if band changed
    if (this.currentBand?.name !== band.name) {
      this.transitionToBand(band);
    }
    
    return band.on;
  }

  /**
   * Update layer alpha values based on transition states
   */
  updateLayerAlphas(deltaMS: number): Map<string, number> {
    const alphas = new Map<string, number>();
    
    for (const [layerName, state] of this.layerStates) {
      if (state.fadingIn) {
        state.alpha = Math.min(1, state.alpha + this.fadeSpeed);
        if (state.alpha >= 1) {
          state.fadingIn = false;
        }
      } else if (state.fadingOut) {
        state.alpha = Math.max(0, state.alpha - this.fadeSpeed);
        if (state.alpha <= 0) {
          state.fadingOut = false;
          state.enabled = false;
        }
      }
      
      if (state.enabled || state.alpha > 0) {
        alphas.set(layerName, state.alpha);
      }
    }
    
    return alphas;
  }

  /**
   * Get current atmospheric band name for UI display
   */
  getCurrentBand(): string {
    return this.currentBand?.name ?? 'unknown';
  }

  /**
   * Check if specific layer should be visible
   */
  isLayerActive(layerName: string): boolean {
    const state = this.layerStates.get(layerName);
    return state?.enabled ?? false;
  }

  /**
   * Get layer alpha (0-1) for rendering
   */
  getLayerAlpha(layerName: string): number {
    const state = this.layerStates.get(layerName);
    return state?.alpha ?? 0;
  }

  private transitionToBand(newBand: Band) {
    const oldActiveLayers = this.currentBand?.on ?? new Set<string>();
    const newActiveLayers = newBand.on;
    
    // Start fading out layers that should be disabled
    for (const layer of oldActiveLayers) {
      if (!newActiveLayers.has(layer)) {
        const state = this.layerStates.get(layer);
        if (state && state.enabled) {
          state.fadingOut = true;
          state.fadingIn = false;
        }
      }
    }
    
    // Start fading in layers that should be enabled
    for (const layer of newActiveLayers) {
      if (!oldActiveLayers.has(layer)) {
        let state = this.layerStates.get(layer);
        if (!state) {
          state = {
            enabled: true,
            alpha: 0,
            fadingIn: true,
            fadingOut: false
          };
          this.layerStates.set(layer, state);
        } else {
          state.enabled = true;
          state.fadingIn = true;
          state.fadingOut = false;
        }
      }
    }
    
    this.currentBand = newBand;
  }
}