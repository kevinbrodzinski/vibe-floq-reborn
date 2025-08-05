
import type { Vibe } from '@/lib/vibes';

// Mapping vibes to Tailwind border classes for avatar rings
export const vibeToBorder = (vibe: Vibe): string => {
const borderMap: Record<Vibe, string> = {
    hype: 'border-purple-500',
    social: 'border-orange-400', 
    chill: 'border-blue-400',
    flowing: 'border-cyan-400',
    open: 'border-green-400',
    curious: 'border-violet-400',
    solo: 'border-teal-400',
    romantic: 'border-pink-500',
    weird: 'border-yellow-400',
    down: 'border-slate-400',
    energetic: 'border-amber-500',
    excited: 'border-purple-500',
    focused: 'border-emerald-500',
  };
  
  return borderMap[vibe] ?? 'border-border';
};

// Get initials from title for avatar display
export const getInitials = (title: string): string => {
  return title
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('');
};
