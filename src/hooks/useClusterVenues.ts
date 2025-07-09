import { useQuery } from '@tanstack/react-query';
import { useVenueClusters } from './useVenueClusters';
import type { ClusterVenue } from './useVenueClusters';

/**
 * Hook for fetching venues within a specific cluster
 * Uses a dummy viewport since we only need the getClusterVenues method
 */
export function useClusterVenues(clusterId: number | null) {
  const { getClusterVenues } = useVenueClusters({ 
    center: [0, 0],
    bounds: [-180, -90, 180, 90], 
    zoom: 1 
  });

  return useQuery<ClusterVenue[]>({
    queryKey: ['cluster-venues', clusterId],
    queryFn: () => clusterId !== null ? getClusterVenues(clusterId) : [],
    enabled: clusterId !== null,
    staleTime: 30_000, // 30 seconds
  });
}