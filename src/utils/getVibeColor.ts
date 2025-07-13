import memoizeOne from 'memoize-one';

// Utility to get consistent vibe colors across the app
const vibeColorMap = new Map([
  ['hype', 'hsl(280 70% 60%)'],
  ['social', 'hsl(30 70% 60%)'], 
  ['chill', 'hsl(240 70% 60%)'],
  ['flowing', 'hsl(200 70% 60%)'],
  ['open', 'hsl(120 70% 60%)'],
  ['curious', 'hsl(260 70% 60%)'],
  ['solo', 'hsl(180 70% 60%)'],
  ['romantic', 'hsl(320 70% 60%)'],
  ['weird', 'hsl(60 70% 60%)'],
  ['down', 'hsl(210 30% 40%)'],
]);

// Memoized function to prevent map recreation
export const getVibeColor = memoizeOne((vibe: string): string => {
  return vibeColorMap.get(vibe?.toLowerCase()) ?? 'hsl(240 70% 60%)';
});