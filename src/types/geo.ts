export type Cluster = {
  gh6: string
  centroid: { type: 'Point'; coordinates: [number, number] }  // Match existing GeoJSON format
  total: number               // legacy – kept for compatibility
  member_count: number        // new – preferred
  vibe_counts: Record<string, number>
  vibe_mode: string           // new – dominant vibe key
}