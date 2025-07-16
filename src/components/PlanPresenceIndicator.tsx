import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wifi } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'offline';
  lastActivity: number;
}

interface PlanPresenceIndicatorProps {
  participants: Participant[];
  isConnected: boolean;
  className?: string;
}

export const PlanPresenceIndicator = ({
  participants,
  isConnected,
  className = ""
}: PlanPresenceIndicatorProps) => {
  const [visibleParticipants, setVisibleParticipants] = useState<Participant[]>([]);
  const maxVisible = 4;
  
  const onlineParticipants = participants.filter(p => p.status === 'online');
  const totalOnline = onlineParticipants.length;
  const overflow = Math.max(0, totalOnline - maxVisible);

  useEffect(() => {
    // Show most recently active participants first
    const sorted = onlineParticipants
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, maxVisible);
    setVisibleParticipants(sorted);
  }, [participants]);

  if (totalOnline === 0) {
    return (
      <div className={`flex items-center space-x-2 text-muted-foreground ${className}`}>
        <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
        <span className="text-sm">Waiting for participants...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Connection status */}
      <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
      
      {/* Live avatars */}
      <div className="flex items-center -space-x-2">
        <AnimatePresence>
          {visibleParticipants.map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <Avatar className="w-8 h-8 border-2 border-background ring-2 ring-green-400/50">
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback className="text-xs">
                  {participant.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Online indicator */}
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-background"
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Overflow indicator */}
        {overflow > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center w-8 h-8 bg-muted text-muted-foreground rounded-full border-2 border-background text-xs font-medium"
          >
            +{overflow}
          </motion.div>
        )}
      </div>

      {/* Count and status */}
      <div className="flex items-center space-x-1 text-sm">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-foreground font-medium">{totalOnline}</span>
        <span className="text-muted-foreground">
          {totalOnline === 1 ? 'person' : 'people'} planning
        </span>
      </div>
    </div>
  );
};