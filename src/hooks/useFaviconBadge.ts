import { useEffect, useRef } from 'react';

/**
 * Hook to manage favicon badge for unread counts
 * Switches between normal and red-dot favicon when totalUnread > 0
 */
export const useFaviconBadge = (totalUnread: number) => {
  const originalFaviconRef = useRef<string | null>(null);
  const currentFaviconRef = useRef<string | null>(null);
  const faviconLinkRef = useRef<HTMLLinkElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    // Get or create the favicon link element (once)
    if (!faviconLinkRef.current) {
      faviconLinkRef.current = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      
      if (!faviconLinkRef.current) {
        faviconLinkRef.current = document.createElement('link');
        faviconLinkRef.current.rel = 'icon';
        document.head.appendChild(faviconLinkRef.current);
      }

      // Store original favicon on first run
      originalFaviconRef.current = faviconLinkRef.current.href || generateDefaultFavicon();
    }

    const targetFavicon = totalUnread > 0 
      ? generateBadgedFavicon() 
      : originalFaviconRef.current;

    // Only update if different to avoid unnecessary DOM updates
    if (currentFaviconRef.current !== targetFavicon) {
      faviconLinkRef.current!.href = targetFavicon;
      currentFaviconRef.current = targetFavicon;
    }
  }, [totalUnread]);

  // Cleanup: restore original favicon on unmount
  useEffect(() => {
    return () => {
      if (currentFaviconRef.current && originalFaviconRef.current && faviconLinkRef.current) {
        faviconLinkRef.current.href = originalFaviconRef.current;
      }
    };
  }, []);

  /**
   * Generate a simple default favicon (floq icon) - High DPI
   */
  function generateDefaultFavicon(): string {
    // Reuse canvas for performance
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
    canvas.width = 64;  // High DPI
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, 64, 64);
    
    // floq circle icon
    ctx.fillStyle = '#8B5CF6'; // primary purple
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, 2 * Math.PI);
    ctx.fill();
    
    // Inner dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    return canvas.toDataURL();
  }

  /**
   * Generate favicon with red notification dot - High DPI
   */
  function generateBadgedFavicon(): string {
    // Reuse canvas for performance
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
    canvas.width = 64;  // High DPI
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, 64, 64);
    
    // Main floq circle (slightly smaller to make room for badge)
    ctx.fillStyle = '#8B5CF6';
    ctx.beginPath();
    ctx.arc(28, 28, 20, 0, 2 * Math.PI);
    ctx.fill();
    
    // Inner dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(28, 28, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Red notification badge
    ctx.fillStyle = '#DC2626'; // destructive red
    ctx.beginPath();
    ctx.arc(48, 16, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    // White border on badge for contrast
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(48, 16, 12, 0, 2 * Math.PI);
    ctx.stroke();
    
    return canvas.toDataURL();
  }
};
