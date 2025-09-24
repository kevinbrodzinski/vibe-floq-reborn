import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Edit, Play, Share2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VibeMatchBadge } from '@/components/ui/VibeMatchBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface FloqPlan {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'active' | 'ended';
  vibe: string;
  startTime: string;
  duration: string;
  maxParticipants: number;
  currentParticipants: number;
  location?: string;
  description?: string;
  host: {
    name: string;
    avatar?: string;
  };
  participants?: Array<{
    name: string;
    avatar?: string;
  }>;
  vibeMatch?: number;
}

interface FloqPlanCardProps {
  plan: FloqPlan;
  isHost: boolean;
  onEdit?: (planId: string) => void;
  onPublish?: (planId: string) => void;
  onJoin?: (planId: string) => void;
  onShare?: (planId: string) => void;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-500 text-white';
    case 'published': return 'bg-blue-500 text-white';
    case 'active': return 'bg-green-500 text-white';
    case 'ended': return 'bg-red-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'draft': return '📝';
    case 'published': return '📢';
    case 'active': return '🎉';
    case 'ended': return '🏁';
    default: return '📝';
  }
};

export const FloqPlanCard: React.FC<FloqPlanCardProps> = ({
  plan,
  isHost,
  onEdit,
  onPublish,
  onJoin,
  onShare,
  className = ''
}) => {
  const isDraft = plan.status === 'draft';
  const isPublished = plan.status === 'published';
  const isActive = plan.status === 'active';
  const canJoin = isPublished || isActive;
  const isFull = plan.currentParticipants >= plan.maxParticipants;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-card/60 backdrop-blur-xl rounded-2xl p-4 border border-border/30",
        "transition-all duration-300 hover:shadow-lg",
        isActive && "ring-2 ring-green-500/50 shadow-green-500/20",
        className
      )}
    >
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{plan.title}</h3>
            <Badge className={getStatusColor(plan.status)}>
              {getStatusIcon(plan.status)} {plan.status}
            </Badge>
          </div>
          
          {/* Vibe Match Badge */}
          {plan.vibeMatch && (
            <div className="mt-2">
              <VibeMatchBadge
                matchPercentage={plan.vibeMatch}
                size="sm"
                showIcon={false}
              />
            </div>
          )}
        </div>

        {/* Action Menu */}
        <div className="flex items-center gap-2">
          {isHost && isDraft && (
            <Button
              size="sm"
              onClick={() => onPublish?.(plan.id)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Play className="w-3 h-3 mr-1" />
              Publish
            </Button>
          )}
          
          {isHost && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit?.(plan.id)}
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onShare?.(plan.id)}
          >
            <Share2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Plan Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(plan.startTime), 'MMM d, yyyy')}</span>
          <Clock className="w-4 h-4 ml-2" />
          <span>{format(new Date(plan.startTime), 'h:mm a')}</span>
        </div>
        
        {plan.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{plan.location}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{plan.currentParticipants}/{plan.maxParticipants} participants</span>
          {isFull && <Badge variant="destructive" className="text-xs">Full</Badge>}
        </div>
      </div>

      {/* Participants */}
      {plan.participants && plan.participants.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Participants</span>
            <AvatarStack avatars={plan.participants} max={5} />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {canJoin && !isFull && (
          <Button
            onClick={() => onJoin?.(plan.id)}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            Join Plan
          </Button>
        )}
        
        {isFull && (
          <Button
            variant="outline"
            className="flex-1"
            disabled
          >
            Plan Full
          </Button>
        )}
        
        {isDraft && !isHost && (
          <Button
            variant="outline"
            className="flex-1"
            disabled
          >
            Not Published
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// Avatar Stack Component
const AvatarStack: React.FC<{ avatars: Array<{ name: string; avatar?: string }>; max?: number }> = ({
  avatars,
  max = 5
}) => {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {displayAvatars.map((participant, index) => (
        <Avatar key={index} className="w-6 h-6 border-2 border-background">
          <AvatarImage src={participant.avatar} />
          <AvatarFallback className="text-xs">
            {participant.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
          +{remaining}
        </div>
      )}
    </div>
  );
}; 