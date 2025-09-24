import React from 'react';
import { ArrowLeft, Settings2, MapPin, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VibeRing } from '@/components/VibeRing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface FloqHeaderProps {
  floqDetails: FloqDetails;
  onBack: () => void;
  onSettings?: () => void;
  onMap?: () => void;
  onSocial?: () => void;
  isHost?: boolean;
  className?: string;
}

export const FloqHeader: React.FC<FloqHeaderProps> = ({
  floqDetails,
  onBack,
  onSettings,
  onMap,
  onSocial,
  isHost = false,
  className = ''
}) => {
  const isOngoing = !floqDetails.ends_at;
  const memberCount = floqDetails.participant_count || floqDetails.participants?.length || 0;

  return (
    <div className={cn("bg-background/90 backdrop-blur-sm border-b border-border/30", className)}>
      {/* Line 1: Back button, Floq icon, name, action buttons */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <VibeRing 
            vibe={floqDetails.primary_vibe} 
            className="w-12 h-12 flex-shrink-0"
            pulse={isOngoing}
          >
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
            <h1 className="text-lg font-semibold truncate">
              {floqDetails.title}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onMap && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMap}
              className="p-2 h-8 w-8"
              aria-label="View map"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          )}
          
          {onSocial && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSocial}
              className="p-2 h-8 w-8"
              aria-label="View social signals"
            >
              <Rss className="h-4 w-4" />
            </Button>
          )}
          
          {onSettings && isHost && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettings}
              className="p-2 h-8 w-8"
              aria-label="Floq settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Line 2: Description */}
      {floqDetails.description && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {floqDetails.description}
          </p>
        </div>
      )}

      {/* Line 3: Vibe badge, ongoing status, member count */}
      <div className="flex items-center gap-3 px-4 pb-4">
        <Badge 
          variant="outline" 
          className="capitalize text-xs"
          style={{ borderColor: `hsl(var(--${floqDetails.primary_vibe}))` }}
        >
          {floqDetails.primary_vibe}
        </Badge>
        
        {isOngoing && (
          <Badge className="bg-persistent text-persistent-foreground text-xs">
            Ongoing
          </Badge>
        )}
        
        <Badge variant="secondary" className="text-xs">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </Badge>
      </div>
    </div>
  );
}; 