import { useEffect, useRef } from 'react';

/**
 * Hook to manage favicon badge for unread counts
 * Switches between normal and red-dot favicon when totalUnread > 0
 */
export const useFaviconBadge = (totalUnread: number) => {
  const originalFaviconRef = useRef<string | null>(null);
  const currentFaviconRef = useRef<string | null>(null);

  useEffect(() => {
    // Get or create the favicon link element
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }

    // Store original favicon on first run
    if (originalFaviconRef.current === null) {
      originalFaviconRef.current = faviconLink.href || generateDefaultFavicon();
    }

    const targetFavicon = totalUnread > 0 
      ? generateBadgedFavicon() 
      : originalFaviconRef.current;

    // Only update if different to avoid unnecessary DOM updates
    if (currentFaviconRef.current !== targetFavicon) {
      faviconLink.href = targetFavicon;
      currentFaviconRef.current = targetFavicon;
    }
  }, [totalUnread]);
};

/**
 * Generate a simple default favicon (floq icon)
 */
function generateDefaultFavicon(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  
  // floq circle icon
  ctx.fillStyle = '#8B5CF6'; // primary purple
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, 2 * Math.PI);
  ctx.fill();
  
  // Inner dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(16, 16, 4, 0, 2 * Math.PI);
  ctx.fill();
  
  return canvas.toDataURL();
}

/**
 * Generate favicon with red notification dot
 */
function generateBadgedFavicon(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  
  // Main floq circle (slightly smaller to make room for badge)
  ctx.fillStyle = '#8B5CF6';
  ctx.beginPath();
  ctx.arc(14, 14, 10, 0, 2 * Math.PI);
  ctx.fill();
  
  // Inner dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(14, 14, 3, 0, 2 * Math.PI);
  ctx.fill();
  
  // Red notification badge
  ctx.fillStyle = '#DC2626'; // destructive red
  ctx.beginPath();
  ctx.arc(24, 8, 6, 0, 2 * Math.PI);
  ctx.fill();
  
  // White border on badge for contrast
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(24, 8, 6, 0, 2 * Math.PI);
  ctx.stroke();
  
  return canvas.toDataURL();
}