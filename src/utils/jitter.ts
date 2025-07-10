// Phase 2: Collision utility for dense friend areas with clustering
// Returns a deterministic offset (px) for the N-th dot in a pixel-perfect cluster.
export const jitterPoint = (index: number) => {
  if (index === 0) return { dx: 0, dy: 0 };            // centre stays still
  const angle = index * 137.508 * (Math.PI / 180);      // golden-angle
  const r     = 6 + index * 2;                          // distance grows 2 px per dot
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r };
};

export function groupByLocation<T extends { lat: number; lng: number }>(
  items: T[],
  precision = 4,
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = `${item.lat.toFixed(precision)}|${item.lng.toFixed(precision)}`;
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

// Special grouping function for Person objects that use x/y instead of lat/lng
export function groupByPosition<T extends { x: number; y: number }>(
  items: T[],
  precision = 1, // precision for percentage values (0-100)
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = `${item.x.toFixed(precision)}|${item.y.toFixed(precision)}`;
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}