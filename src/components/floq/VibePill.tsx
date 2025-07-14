import { getVibeIcon } from '@/utils/vibeIcons';
import { getVibeColor } from '@/utils/getVibeColor';
import type { Vibe } from '@/types';

interface VibePillProps {
  vibe: Vibe;
  className?: string;
}

export const VibePill = ({ vibe, className = '' }: VibePillProps) => {
  const vibeColor = getVibeColor(vibe);
  const icon = getVibeIcon(vibe);

  return (
    <span 
      tabIndex={-1}
      aria-label={`${vibe} vibe`}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}
      style={{ 
        backgroundColor: `${vibeColor}20`,
        color: vibeColor,
        border: `1px solid ${vibeColor}40`
      }}
    >
      <span>{icon}</span>
      <span className="capitalize">{vibe}</span>
    </span>
  );
};