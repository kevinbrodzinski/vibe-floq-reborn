import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresenceSound } from '@/hooks/usePresenceSound';

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
  
  // Enable audio/haptic feedback for presence changes
  usePresenceSound(participants);

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
        <AnimatePresence mode="popLayout">
          {visibleParticipants.map((participant, index) => (
            <motion.div 
              key={participant.id} 
              className="relative" 
              style={{ zIndex: maxVisible - index }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              layout
            >
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
                <motion.div 
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 border border-background rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
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