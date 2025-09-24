import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface Participant {
  id: string
  name: string
  avatar: string
  status: 'online' | 'editing' | 'away'
}

interface PresenceIndicatorProps {
  participants: Participant[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  className?: string
}

export function PresenceIndicator({ participants, connectionStatus, className }: PresenceIndicatorProps) {
  const activeParticipants = participants.filter(p => p.status === 'online' || p.status === 'editing')
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        <div className={cn(
          "w-2 h-2 rounded-full",
          connectionStatus === 'connected' && "bg-green-500",
          connectionStatus === 'connecting' && "bg-yellow-500 animate-pulse",
          connectionStatus === 'disconnected' && "bg-gray-400",
          connectionStatus === 'error' && "bg-red-500"
        )} />
        <span className="text-xs text-muted-foreground">
          {connectionStatus === 'connected' && 'Live'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Offline'}
          {connectionStatus === 'error' && 'Error'}
        </span>
      </div>

      {/* Active Participants */}
      {activeParticipants.length > 0 && (
        <div className="flex -space-x-2">
          {activeParticipants.slice(0, 3).map((participant) => (
            <TooltipProvider key={participant.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative"
                  >
                    <Avatar className="w-6 h-6 border-2 border-background">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                      <AvatarFallback className="text-xs">
                        {participant.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {participant.status === 'editing' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{participant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {participant.status === 'editing' ? 'Currently editing' : 'Online'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {activeParticipants.length > 3 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              +{activeParticipants.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}