import { Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFriendVisitStats } from '@/services/venue';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

interface FriendVisitBadgeProps {
  venueId: string;
  className?: string;
}

export const FriendVisitBadge = ({ venueId, className }: FriendVisitBadgeProps) => {
  const currentUserId = useCurrentUserId();
  const { data, isLoading } = useFriendVisitStats(venueId, currentUserId || '');

  if (isLoading || !data || data.count === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1 text-xs text-emerald-300 ${className}`}>
          <Users className="h-3 w-3" />
          {data.count}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {data.count} friend{data.count > 1 ? 's' : ''} have been here
      </TooltipContent>
    </Tooltip>
  );
};