import { cn } from '@/lib/utils';

interface VenueLoadingOverlayProps {
  show: boolean;
  className?: string;
}

export const VenueLoadingOverlay = ({ show, className }: VenueLoadingOverlayProps) => {
  if (!show) return null;

  return (
    <div className={cn(
      'absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-10',
      'animate-pulse',
      className
    )}>
      <div className="bg-white/90 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-lg">
        Syncing venues...
      </div>
    </div>
  );
};