
import { zIndex } from '@/constants/z';
import { cn } from '@/lib/utils';


export function ClusterBadge({
  count, x, y, onClick
}: { count: number; x: number; y: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${count} places`}
      className={cn(
        'absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center',
        'rounded-full bg-primary text-primary-foreground shadow-lg',
        'border border-primary/40 outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
      )}
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        ...zIndex('mapOverlay').style
      }}
    >
      <span className="text-[12px] font-semibold">+{count}</span>
    </button>
  );
}


