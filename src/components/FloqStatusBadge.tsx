import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

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
  
  const isHost = creatorId === user?.id;
  
  return (
    <Badge 
      variant={isHost ? 'default' : 'kit'} 
      className={className}
      title={isHost ? "You're the host" : "You've joined this floq"}
    >
      {isHost ? 'Host' : 'Joined'}
    </Badge>
  );
};