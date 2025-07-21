import React from 'react';
import { useFloqActivity } from '@/hooks/useFloqActivity';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarClock, MessageCircle, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';

const icons = {
  created: CalendarClock,
  edited: Pencil,
  commented: MessageCircle
};

const actionText = {
  created: 'created a plan',
  edited: 'updated a plan', 
  commented: 'commented on a plan'
};

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
            Activity will appear here when members create or update plans.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activity.map((entry) => {
        const Icon = icons[entry.kind] ?? MessageCircle;
        
        return (
          <Card key={entry.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-xs">
                  {entry.guest_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">
                    {entry.guest_name || 'Someone'}
                  </span>
                  <span className="text-muted-foreground">
                    {actionText[entry.kind]}
                  </span>
                </div>
                
                {entry.content && (
                  <div className="mt-1 text-sm text-foreground">
                    "{entry.content}"
                  </div>
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