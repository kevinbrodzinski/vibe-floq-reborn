import { useFeatureFlag } from '@/hooks/useFeatureFlag';

/** Returns true when the user is enrolled in the timeline-v2 experiment */
export function useTimelineV2(): boolean {
  // For now, we'll use the existing feature flag system
  // This can be replaced with a dedicated user preferences system later
  return useFeatureFlag('TIMELINE_V2');
}