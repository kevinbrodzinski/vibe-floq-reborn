import * as PIXI from 'pixi.js';

/**
 * PIXI v8 compatibility helper for generateTexture
 * Handles both v7 and v8 API signatures
 */
export function generateTexture(renderer: PIXI.Renderer, target: any): PIXI.Texture {
  const r: any = renderer as any;
  
  // Check if this is the v8 signature that expects options object
  return r.generateTexture?.length === 1
    ? r.generateTexture(target)                      // v7 / compatible path
    : r.generateTexture({ target });                 // v8 signature
}