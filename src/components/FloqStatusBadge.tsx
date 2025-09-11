import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export type FloqStatus = 'host' | 'joined';

interface FloqStatusBadgeProps {
  creatorId: string;
  isJoined: boolean;
  className?: string;
}

export const FloqStatusBadge: React.FC<FloqStatusBadgeProps> = ({ 
  creatorId, 
  isJoined, 
  className 
}) => {
  const { user } = useAuth();
  if (!isJoined) return null;

  const isHost = creatorId && user?.id && String(creatorId) === String(user.id);
  return (
    <Badge
      variant={isHost ? 'default' : 'secondary'}
      className={cn('uppercase tracking-wide text-[11px] px-2.5 py-1', className)}
      aria-label={isHost ? 'Host' : 'Joined'}
    >
      {isHost ? 'Host' : 'Joined'}
    </Badge>
  );
};