import React from 'react';
import { Clock, MapPin, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VibeRing } from '@/components/VibeRing';
import { formatDistance } from '@/utils/formatDistance';
import { cn } from '@/lib/utils';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface PublicFloqPreviewProps {
  floqDetails: FloqDetails;
  onJoin: () => void;
  isJoining: boolean;
  liveScore?: { activity_score: number };
}

export const PublicFloqPreview: React.FC<PublicFloqPreviewProps> = ({
  floqDetails,
  onJoin,
  isJoining,
  liveScore
}) => {
  const formatTimeFromNow = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((time.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 0) {
      return `Started ${Math.abs(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 60) {
      return `Starts in ${diffInMinutes}m`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `Starts in ${hours}h ${diffInMinutes % 60}m`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="mx-4 pt-3 pb-4 px-6 bg-gradient-to-br from-card to-card/80">
        <div className="flex items-start gap-4">
          <VibeRing vibe={floqDetails.primary_vibe} className="w-16 h-16">
            <Avatar className="w-full h-full">
              <AvatarImage 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${floqDetails.title}`} 
                alt={floqDetails.title}
              />
              <AvatarFallback className="text-lg font-semibold">
                {floqDetails.title.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </VibeRing>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold mb-2">{floqDetails.title}</h2>
            {floqDetails.name && (
              <p className="text-sm text-muted-foreground mb-2">{floqDetails.name}</p>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className="capitalize"
                style={{ borderColor: `hsl(var(--${floqDetails.primary_vibe}))` }}
              >
                {floqDetails.primary_vibe}
              </Badge>
              {!floqDetails.ends_at && (
                <Badge className="bg-persistent text-persistent-foreground text-xs">
                  Ongoing
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{floqDetails.participant_count} members</span>
                {floqDetails.max_participants && (
                  <span>/ {floqDetails.max_participants}</span>
                )}
              </div>
              
              {floqDetails.starts_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeFromNow(floqDetails.starts_at)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>
                  {floqDetails.location.lat.toFixed(4)}, {floqDetails.location.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Score */}
        {(liveScore?.activity_score !== undefined || floqDetails.activity_score !== undefined) && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Activity</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-foreground transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${Math.min(100, (liveScore?.activity_score || floqDetails.activity_score || 0))}%`,
                      transform: liveScore?.activity_score !== floqDetails.activity_score ? 'scaleX(1.1)' : 'scaleX(1)',
                    }}
                  />
                </div>
                <span className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  liveScore?.activity_score !== floqDetails.activity_score && "text-primary"
                )}>
                  {Math.round(liveScore?.activity_score || floqDetails.activity_score || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Participants Preview */}
      {floqDetails.participants.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Members</h3>
            <Badge variant="secondary">{floqDetails.participants.length}</Badge>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {floqDetails.participants.slice(0, 8).map((participant) => (
              <div key={participant.user_id} className="flex flex-col items-center gap-1">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={participant.avatar_url} alt={participant.display_name} />
                  <AvatarFallback className="text-xs">
                    {participant.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-center truncate w-full">
                  {participant.display_name}
                </span>
                {participant.role === 'creator' && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    Host
                  </Badge>
                )}
              </div>
            ))}
            {floqDetails.participants.length > 8 && (
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium">
                    +{floqDetails.participants.length - 8}
                  </span>
                </div>
                <span className="text-xs text-center text-muted-foreground">
                  more
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Join Action */}
      <div className="px-4">
        <Button
          onClick={onJoin}
          disabled={isJoining}
          className="w-full"
          size="lg"
        >
          {isJoining ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Join Floq
            </>
          )}
        </Button>
      </div>

      {/* Bottom padding for scroll clearance */}
      <div className="pb-8" />
    </div>
  );
};