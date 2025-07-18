import { useFeatureFlag } from '@/hooks/useFeatureFlag';

/** Returns true when the user is enrolled in the timeline-v2 experiment */
export function useTimelineV2(): boolean {
  // SSR safety - only check feature flag on client
  if (typeof window === 'undefined') return false;
  
  // For now, we'll use the existing feature flag system
  // This can be replaced with a dedicated user preferences system later
  return useFeatureFlag('TIMELINE_V2');
}