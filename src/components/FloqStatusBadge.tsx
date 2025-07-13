import { Badge } from '@/components/ui/badge';
import { useSession } from '@supabase/auth-helpers-react';

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
  const session = useSession();
  
  if (!isJoined) return null;
  
  const isHost = creatorId === session?.user?.id;
  
  return (
    <Badge 
      variant={isHost ? 'default' : 'outline'} 
      className={`${className} ${!isHost ? 'text-primary-foreground/80' : ''}`}
      title={isHost ? "You're the host" : "You've joined this floq"}
    >
      {isHost ? 'Host' : 'Joined'}
    </Badge>
  );
};