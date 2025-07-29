import { cn } from '@/lib/utils';
import { vibeToBorder } from '@/utils/vibeColors';
import type { Vibe } from '@/types/vibes';

interface VibeHaloProps {
  vibe?: Vibe | string;
  children: React.ReactNode;
  className?: string;
}

export const VibeHalo = ({ vibe, children, className }: VibeHaloProps) => {
  if (!vibe) return <div className={className}>{children}</div>;

  const borderColor = vibeToBorder(vibe as Vibe);
  
  return (
    <div className={cn('relative inline-block', className)}>
      {/* Animated gradient ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full animate-spin',
          'bg-gradient-to-tr from-transparent via-current to-transparent',
          'before:absolute before:inset-[2px] before:rounded-full before:bg-[#0B0E19]',
          borderColor.replace('border-', 'text-')
        )}
        style={{
          animationDuration: '12s',
          animationTimingFunction: 'linear'
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
};