import { getVibeIcon } from '@/utils/vibeIcons';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe } from '@/lib/vibes';
import type { Vibe } from '@/types';

interface VibePillProps {
  vibe: Vibe;
  className?: string;
}

export const VibePill = ({ vibe, className = '' }: VibePillProps) => {
  const vibeColor = vibeToHex(safeVibe(vibe));
  const icon = getVibeIcon(vibe);

  return (
    <span 
      tabIndex={-1}
      aria-label={`${vibe} vibe`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${className}`}
      style={{ 
        backgroundColor: `${vibeColor}20`,
        color: vibeColor,
        border: `1px solid ${vibeColor}50`,
        boxShadow: `0 0 10px ${vibeColor}30`
      }}
    >
      <span className="text-sm">{icon}</span>
      <span className="capitalize tracking-wide">{vibe}</span>
    </span>
  );
};