import React from 'react';
import { useFloqActivity, type MergedActivity } from '@/hooks/useFloqActivity';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveActivityDisplay } from '@/utils/activityHelpers';

interface FloqActivityStreamProps {
  floqId: string;
}

export const FloqActivityStream: React.FC<FloqActivityStreamProps> = ({ floqId }) => {
  const { activity, isLoading } = useFloqActivity(floqId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!activity.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">No activity yet</h4>
          <p className="text-sm text-muted-foreground">
            Activity will appear here when members interact with the floq.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activity.map((entry: MergedActivity) => {
        const display = resolveActivityDisplay(entry);
        
        
        return (
          <Card key={entry.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={
                  entry.source === 'flock_history' 
                    ? entry.user_profile?.avatar_url || undefined 
                    : undefined
                } />
                <AvatarFallback className="text-xs">
                  {display.userName?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <display.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">
                    {display.userName}
                  </span>
                  <span className="text-muted-foreground">
                    {display.action}
                  </span>
                </div>
                
                {display.content && (
                  <div className="mt-1 text-sm text-foreground">
                    "{display.content}"
                  </div>
                )}
                
                {/* Show vibe badge for vibe changes */}
                {display.isVibeChange && display.vibeValue && (
                  <Badge variant="outline" className="text-xs capitalize mt-1">
                    {display.vibeValue}
                  </Badge>
                )}
                
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};