import type { FloqTab } from '@/store/useActiveTab';

/**
 * Fire-and-forget pre-fetch for code-splits **and** primary data
 * so the tab feels instant when opened.
 */
export const prefetchTab = (tab: FloqTab) => {
  // Code-split bundle prefetch
  switch (tab) {
    case 'field':
      import('@/components/screens/FieldScreen').catch(() => {});
      break;
    case 'floqs':
      import('@/components/screens/FloqsScreen').catch(() => {});
      break;
    case 'pulse':
      import('@/components/screens/PulseScreen').catch(() => {});
      break;
    case 'vibe':
      import('@/components/screens/VibeScreen').catch(() => {});
      break;
    case 'afterglow':
      import('@/components/screens/AfterglowScreen').catch(() => {});
      break;
    case 'plan':
      import('@/components/plans/PlansHub').catch(() => {});
      break;
  }
  
  // TODO: Add data prefetching here when specific queries are identified
  // Example:
  // if (tab === 'field') {
  //   queryClient.prefetchQuery(['nearby-venues']);
  //   queryClient.prefetchQuery(['bucket-presence']);
  // }
};