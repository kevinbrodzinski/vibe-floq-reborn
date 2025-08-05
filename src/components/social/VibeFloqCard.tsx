import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  MapPin, 
  Clock, 
  Eye, 
  UserPlus, 
  Zap,
  Circle,
  Waves,
  Brain,
  Target,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVibeColor } from '@/utils/getVibeColor';

interface VibeFloqCardProps {
  floq: {
    id: string;
    title: string;
    description: string;
    vibe: string;
    distance: string;
    timeLeft: string;
    participants: number;
    maxParticipants: number;
    isLive: boolean;
    isNew: boolean;
    boostCount: number;
    creator: string;
  };
}

const VibeIcon = ({ vibe, size = 16 }: { vibe: string; size?: number }) => {
  const iconProps = { size, className: "text-current" };
  
  switch (vibe) {
    case 'flowing':
      return <Waves {...iconProps} />;
    case 'focused':
      return <Target {...iconProps} />;
    case 'zen':
      return <Sparkles {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
};

export const VibeFloqCard: React.FC<VibeFloqCardProps> = ({ floq }) => {
  const vibeColor = getVibeColor(floq.vibe);
  const isFull = floq.participants >= floq.maxParticipants;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
        <CardContent className="p-3 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div 
                className="p-1.5 sm:p-2 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: `${vibeColor}20`,
                  border: `1px solid ${vibeColor}40`
                }}
              >
                <VibeIcon vibe={floq.vibe} size={16} />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{floq.title}</h3>
                  {floq.isNew && (
                    <Badge variant="secondary" className="text-xs font-medium px-1.5 py-0.5">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {floq.description}
                </p>
              </div>
            </div>
            
            {/* Vibe pill */}
            <div 
              className="px-1.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide flex items-center gap-1 flex-shrink-0"
              style={{
                backgroundColor: `${vibeColor}15`,
                color: vibeColor,
                border: `1px solid ${vibeColor}30`
              }}
            >
              {floq.vibe}
            </div>
          </div>

          {/* Creator info */}
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
              <AvatarImage src={`https://i.pravatar.cc/32?u=${floq.creator}`} />
              <AvatarFallback className="text-xs">
                {floq.creator[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs sm:text-sm text-muted-foreground truncate">
              hosted by {floq.creator}
            </span>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-muted/50 rounded-lg">
              <Users size={12} className="text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">
                {floq.participants}/{floq.maxParticipants}
              </span>
            </div>
            
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-muted/50 rounded-lg">
              <MapPin size={12} className="text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">{floq.distance}</span>
            </div>
            
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-muted/50 rounded-lg">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium">{floq.timeLeft}</span>
            </div>

            {floq.isLive && (
              <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-emerald-500/10 rounded-lg">
                <Circle size={6} className="text-emerald-500 fill-current" />
                <span className="text-xs sm:text-sm font-medium text-emerald-500">Live</span>
              </div>
            )}
            
            {floq.boostCount > 0 && (
              <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-orange-500/10 rounded-lg">
                <Zap size={12} className="text-orange-500" />
                <span className="text-xs sm:text-sm font-medium text-orange-500">
                  {floq.boostCount}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 sm:h-9 text-xs sm:text-sm">
              <Eye size={14} className="mr-1 sm:mr-2" />
              View
            </Button>
            
            <Button 
              size="sm" 
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
              disabled={isFull}
              variant={isFull ? "secondary" : "default"}
            >
              <UserPlus size={14} className="mr-1 sm:mr-2" />
              {isFull ? 'Full' : 'Join'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};