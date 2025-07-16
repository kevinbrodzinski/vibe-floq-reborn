import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  isOnline?: boolean;
}

interface PlanPresenceIndicatorProps {
  participants: Participant[];
  isConnected?: boolean;
  maxVisible?: number;
  className?: string;
}

export function PlanPresenceIndicator({ 
  participants, 
  isConnected = false, 
  maxVisible = 5,
  className = '' 
}: PlanPresenceIndicatorProps) {
  const visibleParticipants = participants.slice(0, maxVisible);
  const extraCount = participants.length - visibleParticipants.length;
  const onlineCount = participants.filter(p => p.isOnline).length;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
        <span className="text-xs text-muted-foreground">
          {onlineCount}/{participants.length} online
        </span>
      </div>

      {/* Avatar Group */}
      <div className="flex items-center space-x-[-0.5rem]">
        {visibleParticipants.map((participant, index) => (
          <div key={participant.id} className="relative" style={{ zIndex: maxVisible - index }}>
            <Avatar className="h-6 w-6 border-2 border-background">
              {participant.avatar_url ? (
                <AvatarImage src={participant.avatar_url} alt={participant.name} />
              ) : (
                <AvatarFallback className="text-xs">
                  {participant.name?.charAt(0)?.toUpperCase() || 
                   participant.username?.charAt(0)?.toUpperCase() || 
                   '?'}
                </AvatarFallback>
              )}
            </Avatar>
            {/* Online status indicator */}
            {participant.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 border border-background rounded-full" />
            )}
          </div>
        ))}
        
        {/* Extra count badge */}
        {extraCount > 0 && (
          <Badge variant="secondary" className="h-6 w-6 p-0 text-xs flex items-center justify-center ml-1">
            +{extraCount}
          </Badge>
        )}
      </div>
    </div>
  );
}