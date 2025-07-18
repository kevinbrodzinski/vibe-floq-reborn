import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getVibeGradient } from '@/lib/utils/getGradientClasses';
import { vibeEmoji } from '@/utils/vibe';
import type { MyFloq } from '@/hooks/useMyFlocks';

interface FlockAvatarProps {
  flock: MyFloq;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function FlockAvatar({ flock, size = 104, className, onClick }: FlockAvatarProps) {
  const gradient = getVibeGradient('floq', flock.primary_vibe);
  const initials = flock.title?.split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('') || '?';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={cn(
        'relative flex-shrink-0 rounded-2xl shadow-md shadow-black/20',
        'ring-1 ring-white/5 overflow-hidden focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Gradient background with initials fallback */}
      <div className={cn('w-full h-full flex items-center justify-center', gradient)}>
        <span className="font-bold text-xl/none tracking-wide text-white/90">
          {initials}
        </span>
      </div>

      {/* Vibe badge */}
      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
        <span className="text-[11px] leading-none">
          {vibeEmoji(flock.primary_vibe)}
        </span>
      </div>
    </motion.button>
  );
}