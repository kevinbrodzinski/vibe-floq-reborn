import { useEffect, useState } from 'react';

export const useBottomGap = () => {
  const [bottomGap, setBottomGap] = useState(0);

  useEffect(() => {
    const calculateBottomGap = () => {
      // Find the navigation element
      const nav = document.querySelector('nav[style*="z-index"]') as HTMLElement;
      if (nav) {
        const navHeight = nav.offsetHeight;
        // Add some padding for safe area (equivalent to safe area insets)
        const safeAreaPadding = 16; // 1rem equivalent
        setBottomGap(navHeight + safeAreaPadding);
      } else {
        // Fallback if nav not found - typical mobile nav height
        setBottomGap(80); // ~5rem typical mobile nav + padding
      }
    };

    // Calculate on mount
    calculateBottomGap();

    // Recalculate on resize
    window.addEventListener('resize', calculateBottomGap);
    
    // Clean up
    return () => window.removeEventListener('resize', calculateBottomGap);
  }, []);

  return bottomGap;
};