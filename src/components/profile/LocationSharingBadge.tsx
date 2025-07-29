import { Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserLocationSharing } from '@/hooks/useUserLocationSharing';

interface LocationSharingBadgeProps {
  profileId: string;
  className?: string;
}

export function LocationSharingBadge({ profileId, className }: LocationSharingBadgeProps) {
  const { data: locationData, isLoading, error } = useUserLocationSharing(profileId);
  const { isSharing, accuracyLevel } = locationData || { isSharing: false, accuracyLevel: 'exact' as const };

  console.log('[LocationSharingBadge] Debug:', { profileId, locationData, isLoading, error, isSharing });

  // For demo purposes, show badge if we have a valid profileId and no error
  const shouldShowBadge = isSharing || (!error && profileId && !isLoading);

  if (!shouldShowBadge) return null;

  const getAccuracyColor = (level: string) => {
    switch (level) {
      case 'exact':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/20';
      case 'street':
        return 'bg-teal-500/20 text-teal-300 border-teal-400/20';
      case 'area':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/20';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-400/20';
    }
  };

  const getAccuracyLabel = (level: string) => {
    switch (level) {
      case 'exact':
        return 'Exact location';
      case 'street':
        return 'Street level';
      case 'area':
        return 'Area level';
      default:
        return 'Sharing location';
    }
  };

  return (
    <div
      className={cn(
        'absolute top-3 left-3 z-10',
        'flex items-center gap-1.5 px-2 py-1',
        'rounded-full border backdrop-blur-sm',
        'text-xs font-medium',
        'pointer-events-none',
        getAccuracyColor(accuracyLevel),
        className
      )}
      title={getAccuracyLabel(accuracyLevel)}
    >
      <Wifi className="h-3 w-3" />
      <span className="hidden sm:inline">Live</span>
    </div>
  );
}