import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { vibeEmoji } from '@/utils/vibe';
import { useActiveVibe } from '@/hooks/useActiveVibe';

interface Props {
  className?: string;
}

export const FieldHeroInfo = ({ className }: Props) => {
  const { vibeTag, vibeLabel } = useActiveVibe();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-full flex items-center justify-center gap-2 text-sm',
        'font-medium tracking-wide text-foreground/80',
        className
      )}
    >
      <Sparkles className="h-4 w-4 text-primary animate-pulse-slow" />
      <span>You're in:&nbsp;</span>
      <span className="text-primary font-semibold flex items-center gap-1">
        {vibeEmoji(vibeTag)}
        {vibeLabel}
      </span>
    </div>
  );
};