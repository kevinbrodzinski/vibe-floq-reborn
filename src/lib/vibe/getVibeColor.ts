// Get HSL color for vibe state
export function getVibeColor(vibe: string): string {
  // Map vibe strings to HSL colors
  const vibeColors: Record<string, string> = {
    'chill': 'hsl(200 80% 60%)',
    'energetic': 'hsl(30 90% 60%)', 
    'focused': 'hsl(260 80% 60%)',
    'social': 'hsl(340 80% 60%)',
    'creative': 'hsl(280 80% 60%)',
    'adventure': 'hsl(120 80% 60%)',
    'default': 'hsl(220 80% 60%)'
  };
  
  return vibeColors[vibe] || vibeColors.default;
}