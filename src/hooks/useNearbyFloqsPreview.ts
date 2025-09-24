// Vibe-specific nearby floqs preview hook
export interface NearbyFloqsPreview {
  count: number;
  closestDistance: string;
  activeNow: number;
  topVibe: string;
}

export const useNearbyFloqsPreview = (): NearbyFloqsPreview => {
  // Mock data for now - will be replaced with real data later
  return {
    count: 7,
    closestDistance: '0.2km',
    activeNow: 3,
    topVibe: 'flowing'
  };
};