// DEPRECATED: Use unified vibe system from "@/lib/vibes" and "@/lib/vibe/color"
import type { Vibe } from '@/lib/vibes';
import { vibeToHex } from '@/lib/vibe/color';

// Legacy function - use vibeToHex directly
export const vibeToBorder = (vibe: Vibe): string => {
  // This now uses the unified color system
  const hex = vibeToHex(vibe);
  return `border-[${hex}]`;
};

// Get initials from title for avatar display
export const getInitials = (title: string): string => {
  return title
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('');
};