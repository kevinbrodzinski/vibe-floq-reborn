import { useCallback } from 'react';
import type { AfterglowMoment } from '@/types/afterglow';
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
export function useMomentDetailPrefetch(): (moment: AfterglowMoment) => void {
  const prefetchMomentDetails = useCallback((moment: AfterglowMoment) => {
    if (!moment?.id) return;
    
    // Prefetch related moments with proper template literal
    useSWR(
      `related-moments?momentId=${moment.id}`,
      () => fetchRelatedMoments(moment.id),
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }
    );
  }, []);

  return prefetchMomentDetails;
}