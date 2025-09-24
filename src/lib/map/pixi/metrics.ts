// src/lib/map/pixi/metrics.ts
// Lightweight performance counters for debugging

import * as PIXI from 'pixi.js';

export function countStageSprites(stage: PIXI.Container): number {
  let count = 0;
  
  function traverse(container: PIXI.Container) {
    count += container.children.length;
    container.children.forEach(child => {
      if (child instanceof PIXI.Container) {
        traverse(child);
      }
    });
  }
  
  traverse(stage);
  return count;
}

export function getPixiMemoryUsage(renderer: PIXI.Renderer): { textures: number; geometries: number } {
  return {
    textures: (renderer as any).texture?.managedTextures?.length ?? 0,
    geometries: (renderer as any).geometry?.managedGeometries?.length ?? 0,
  };
}