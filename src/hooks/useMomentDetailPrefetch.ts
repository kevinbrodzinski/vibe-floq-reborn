import { useCallback } from 'react';
import { AfterglowMoment } from '@/lib/afterglow-helpers';
import useSWR from 'swr';

interface RelatedMomentsResponse {
  related: AfterglowMoment[];
}

/**
 * SWR fetcher for related moments
 */
const fetchRelatedMoments = async (momentId: string): Promise<RelatedMomentsResponse> => {
  // This would typically call your API endpoint
  // For now, return empty array as placeholder
  return { related: [] };
};

/**
 * Hook for prefetching moment details on hover
 */
export function useMomentDetailPrefetch() {
  const prefetchMomentDetails = useCallback((moment: AfterglowMoment) => {
    // Prefetch related moments when user hovers over a moment
    return useSWR(
      moment?.id ? `related-moments-${moment.id}` : null,
      () => fetchRelatedMoments(moment.id),
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }
    );
  }, []);

  return { prefetchMomentDetails };
}