// Phase 1C: Collision utility for dense friend areas
export const jitterPoint = (index: number) => {
  // Golden-angle spiral = minimal overlap
  const angle = (index * 137.508) * (Math.PI / 180);
  const r = 4 + 1.5 * index; // px
  return { 
    dx: Math.cos(angle) * r, 
    dy: Math.sin(angle) * r 
  };
};

export const groupByLocation = <T extends { lat: number; lng: number }>(
  items: T[], 
  precision = 4
): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};
  
  items.forEach(item => {
    const key = `${item.lat.toFixed(precision)}|${item.lng.toFixed(precision)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  
  return groups;
};