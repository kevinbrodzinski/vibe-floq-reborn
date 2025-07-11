// Utility to get consistent vibe colors across the app
export const getVibeColor = (vibe: string, opacity = 1): string => {
  const vibeColors: Record<string, string> = {
    hype: '280 70% 60%',
    social: '30 70% 60%', 
    chill: '240 70% 60%',
    flowing: '200 70% 60%',
    open: '120 70% 60%',
    curious: '260 70% 60%',
    solo: '180 70% 60%',
    romantic: '320 70% 60%',
    weird: '60 70% 60%',
    down: '210 30% 40%',
  };
  
  const hslValues = vibeColors[vibe?.toLowerCase()] ?? '240 70% 60%';
  return `hsl(${hslValues} / ${opacity})`;
};

// Helper for canvas rendering with direct HSL values
export const vibeColor = (vibe: string, opacity = 1): string => getVibeColor(vibe, opacity);