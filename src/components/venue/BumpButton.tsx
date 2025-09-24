import { useToggleVenueBump, useLiveBumpCount } from '@/services/venue';
import { cn } from '@/lib/utils';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface BumpButtonProps {
  venueId: string;
  initialCount?: number;
  className?: string;
  variant?: 'default' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export const BumpButton = ({ 
  venueId, 
  initialCount = 0, 
  className,
  variant = 'ghost',
  size = 'icon'
}: BumpButtonProps) => {
  const [hasBumped, setHasBumped] = useState(false);
  const liveCount = useLiveBumpCount(venueId);
  const toggle = useToggleVenueBump(venueId);

  const count = liveCount ?? initialCount;

  return (
    <Button
      variant={hasBumped ? 'secondary' : variant}
      size={size}
      disabled={toggle.isPending}
      onClick={async () => {
        setHasBumped((prev) => !prev);
        try {
          await toggle.mutateAsync();
        } catch {
          // revert on failure
          setHasBumped((prev) => !prev);
        }
      }}
      className={cn('relative', className)}
      aria-label="Bump this venue"
    >
      <ThumbsUp className={cn(
        "shrink-0",
        size === 'icon' ? "h-4 w-4" : "h-3 w-3"
      )} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-medium min-w-[18px] text-center">
          {count}
        </span>
      )}
    </Button>
  );
};