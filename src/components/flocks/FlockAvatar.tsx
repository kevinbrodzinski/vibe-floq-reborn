import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getVibeGradient } from '@/lib/utils/getGradientClasses';
import { vibeEmoji } from '@/utils/vibe';
import type { MyFloq } from '@/hooks/useMyFlocks';

interface FlockAvatarProps {
  flock: MyFloq;
  size?: number; // diameter in px
  className?: string;
  onClick?: () => void;
  glow?: boolean; // NEW → neon style
}

export function FlockAvatar({
  flock,
  size = 104,
  className,
  onClick,
  glow = true, // default ON for new look
}: FlockAvatarProps) {
  const gradient = getVibeGradient('floq', flock.primary_vibe);
  const initials =
    flock.title
      ?.split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join('') || '?';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{ width: size, height: size }}
      className={cn(
        'relative shrink-0 rounded-full overflow-hidden select-none ring-2 ring-black/40',
        glow
          ? "after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-[radial-gradient(var(--neon),_transparent_60%)] after:opacity-60 after:blur-2xl"
          : '',
        gradient,
        className,
      )}
    >
      {/* fallback initials (always show since no cover_url in MyFloq) */}
      <div className="flex h-full w-full items-center justify-center font-bold text-xl text-white/90">
        {initials}
      </div>
      {/* vibe chip */}
      <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs backdrop-blur">
        {vibeEmoji(flock.primary_vibe)}
      </span>
    </div>
  );
}