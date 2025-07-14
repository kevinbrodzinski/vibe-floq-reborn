import React from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users } from 'lucide-react';
import { VibeRing } from '@/components/VibeRing';
import { cn } from '@/lib/utils';
import type { MyFloq } from '@/hooks/useMyFlocks';

interface StoriesBarProps {
  flocks: MyFloq[];
  onCreatePress?: () => void;
  onFlockPress?: (flockId: string) => void;
  isLoading?: boolean;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  flocks,
  onCreatePress,
  onFlockPress,
  isLoading = false,
}) => {

  const getActivityIndicator = (floq: MyFloq) => {
    const minutesSinceActivity = floq.last_activity_at 
      ? Math.floor((Date.now() - new Date(floq.last_activity_at).getTime()) / (1000 * 60))
      : 999;
    
    if (minutesSinceActivity < 10) return 'animate-pulse';
    if (minutesSinceActivity < 60) return 'opacity-80';
    return 'opacity-60';
  };

  if (isLoading) {
    return (
      <Card className="px-4 py-3 bg-background/70 backdrop-blur-md shadow-sm border-border/40">
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
              <div className="w-12 h-3 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Empty state for no flocks
  if (flocks.length === 0) {
    return (
      <Card className="px-4 py-3 bg-background/70 backdrop-blur-md shadow-sm border-border/40">
        <div className="flex gap-4">
          {/* Create new floq button */}
          <button
            onClick={onCreatePress}
            className="flex flex-col items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-1"
            aria-label="Create new Floq"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted/70 border-2 border-dashed border-muted-foreground/40 hover:border-primary/60 hover:bg-muted transition-colors">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">New</span>
          </button>
          
          {/* Empty state message */}
          <div className="flex items-center justify-center flex-1 py-6">
            <div className="text-center max-w-xs">
              <p className="text-sm text-muted-foreground mb-2">
                Looks like you haven't created or joined any flocks yet.
              </p>
              <p className="text-xs text-muted-foreground/80">
                Tap + to get started!
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="px-4 py-3 bg-background/70 backdrop-blur-md shadow-sm border-border/40">
      <ScrollArea className="w-full">
        <div className="flex gap-4 pr-4">
          {/* Create new floq button */}
          <button
            onClick={onCreatePress}
            className="flex flex-col items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-1"
            aria-label="Create new Floq"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted/70 border-2 border-dashed border-muted-foreground/40 hover:border-primary/60 hover:bg-muted transition-colors">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">New</span>
          </button>

          {flocks.map((floq) => (
            <button
              key={floq.id}
              onClick={() => onFlockPress?.(floq.id)}
              className={cn(
                "flex flex-col items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg p-1 transition-all",
                getActivityIndicator(floq)
              )}
              aria-label={`Open ${floq.title} floq`}
            >
              <div className="relative">
                <VibeRing 
                  vibe={floq.primary_vibe}
                  pulse={getActivityIndicator(floq) === 'animate-pulse'}
                  className="w-16 h-16"
                >
                  <Avatar className="w-full h-full transition-transform hover:scale-105">
                    <AvatarImage 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${floq.title}`} 
                      alt={floq.title}
                    />
                    <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/10 to-secondary/10">
                      {(floq.title || 'Untitled').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </VibeRing>
                
                {/* Participant count indicator */}
                {floq.participant_count > 1 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -bottom-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-bold border border-background"
                  >
                    <Users className="w-2.5 h-2.5 mr-0.5" />
                    {floq.participant_count > 99 ? '99+' : floq.participant_count}
                  </Badge>
                )}
                
                {/* Creator indicator */}
                {floq.is_creator && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-primary border border-background flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-background" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center gap-0.5">
                <span className="max-w-[80px] truncate text-[11px] leading-tight font-medium text-foreground">
                  {floq.title || 'Untitled'}
                </span>
                <span 
                  className="text-[9px] capitalize px-1.5 py-0.5 rounded-full text-white text-opacity-90"
                  style={{ backgroundColor: `hsl(var(--${floq.primary_vibe}))` }}
                >
                  {floq.primary_vibe}
                </span>
              </div>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="mt-2" />
      </ScrollArea>
    </Card>
  );
};