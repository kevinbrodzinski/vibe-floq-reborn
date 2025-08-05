// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

export interface SmartFloqMatch {
  id: string;
  title: string;
  matchScore: number;
}

export const useSmartFloqDiscovery = () => {
  return {
    smartMatches: [],
    loading: false,
    error: null
  };
};