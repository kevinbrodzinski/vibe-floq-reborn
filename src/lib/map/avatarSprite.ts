/* eslint-disable @typescript-eslint/no-explicit-any */
import type mapboxgl from 'mapbox-gl';

// Cache to avoid re-downloading the same avatar
const spriteCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string | null>>();

/**
 * Ensure an avatar image is loaded into the map sprite and return the iconId
 * @param map Mapbox map instance
 * @param userId Unique user identifier
 * @param photoUrl URL of the avatar image
 * @param size Desired size (default 64px)
 * @returns Promise resolving to iconId or null if failed
 */
export async function ensureAvatarImage(
  map: mapboxgl.Map, 
  userId: string, 
  photoUrl: string, 
  size = 64
): Promise<string | null> {
  const iconId = `avatar:${userId}:${size}`;
  
  // Already in sprite
  if (map.hasImage(iconId)) {
    return iconId;
  }
  
  // Already cached
  if (spriteCache.has(iconId)) {
    const cached = spriteCache.get(iconId)!;
    if (!map.hasImage(cached)) {
      // Re-add to map if missing
      try {
        const img = await loadImageAsCircle(photoUrl, size);
        map.addImage(cached, img, { sdf: false });
      } catch {
        return null;
      }
    }
    return cached;
  }
  
  // Already loading
  if (loadingPromises.has(iconId)) {
    return loadingPromises.get(iconId)!;
  }
  
  // Start loading
  const promise = (async () => {
    try {
      const img = await loadImageAsCircle(photoUrl, size);
      map.addImage(iconId, img, { sdf: false });
      spriteCache.set(iconId, iconId);
      return iconId;
    } catch {
      return null;
    } finally {
      loadingPromises.delete(iconId);
    }
  })();
  
  loadingPromises.set(iconId, promise);
  return promise;
}

/**
 * Load an image URL and convert to a circular ImageData for Mapbox sprite
 */
async function loadImageAsCircle(url: string, size: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get 2D context'));
        return;
      }
      
      canvas.width = size;
      canvas.height = size;
      
      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      ctx.clip();
      
      // Draw image to fill the circle
      ctx.drawImage(img, 0, 0, size, size);
      
      // Add subtle border
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      resolve(ctx.getImageData(0, 0, size, size));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Clear avatar cache (useful on logout or profile changes)
 */
export function clearAvatarCache() {
  spriteCache.clear();
  loadingPromises.clear();
}