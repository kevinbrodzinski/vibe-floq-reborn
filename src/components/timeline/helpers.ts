// Helper function to determine if geometry mode is needed
export function needsGeometry(moments: any[]): boolean {
  return (
    moments.length > 50 ||
    moments.some(m => (m.heightVariance ?? 0) > 40)
  );
}

// Calculate average card height for better height unit estimation
export function getAverageCardHeight(containerRef: React.RefObject<HTMLElement>): number {
  if (!containerRef.current) return 80; // fallback
  
  const cards = containerRef.current.querySelectorAll('[data-moment-index]');
  if (cards.length === 0) return 80;
  
  const totalHeight = Array.from(cards).reduce((sum, card) => sum + card.clientHeight, 0);
  return Math.round(totalHeight / cards.length);
}