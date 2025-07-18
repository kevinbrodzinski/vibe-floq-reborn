
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Activity, Calendar, Users, MapPin, Clock, LogOut, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { FloqDetails } from '@/hooks/useFloqDetails';
import type { LiveFloqScore } from '@/hooks/useLiveFloqScore';
import { FloqChat } from './FloqChat';
import { FloqPlansTab } from './FloqPlansTab';
import { useFloqPlans } from '@/hooks/useFloqPlans';

interface JoinedFloqViewProps {
  floqDetails: FloqDetails;
  onLeave: () => void;
  isLeaving: boolean;
  liveScore?: LiveFloqScore;
  onEndFloq?: () => void;
  isEndingFloq?: boolean;
}

export const JoinedFloqView: React.FC<JoinedFloqViewProps> = ({
  floqDetails,
  onLeave,
  isLeaving,
  liveScore,
  onEndFloq,
  isEndingFloq = false,
}) => {
  const [activeTab, setActiveTab] = useState('chat');
  const { data: plans = [] } = useFloqPlans(floqDetails.id);

  const formatLocation = (location: any) => {
    if (!location) return 'Location not set';
    
    if (typeof location === 'object' && location.coordinates) {
      const [lng, lat] = location.coordinates;
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    
    return 'Location available';
  };

  const isActive = floqDetails.ends_at ? new Date(floqDetails.ends_at) > new Date() : true;
  const timeLeft = floqDetails.ends_at ? formatDistanceToNow(new Date(floqDetails.ends_at)) : null;

  return (
    <div className="space-y-6">
      {/* Floq Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{floqDetails.title}</h2>
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? 'Active' : 'Ended'}
                </Badge>
              </div>
              {floqDetails.description && (
                <p className="text-muted-foreground">{floqDetails.description}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onLeave}
              disabled={isLeaving}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {isLeaving ? 'Leaving...' : 'Leave'}
            </Button>
          </div>

          {/* Floq Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{floqDetails.participant_count || 0} members</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{formatLocation(floqDetails.location)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDistanceToNow(new Date(floqDetails.starts_at))} ago</span>
            </div>
            {timeLeft && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{timeLeft} left</span>
              </div>
            )}
          </div>

          {/* Live Score */}
          {liveScore && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Energy: {liveScore.energy_score}/100</span>
              <span className="text-muted-foreground">•</span>
              <span>Vibe: {liveScore.vibe_intensity}/100</span>
            </div>
          )}

          {/* Host Actions */}
          {onEndFloq && isActive && (
            <div className="pt-2 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={onEndFloq}
                disabled={isEndingFloq}
              >
                {isEndingFloq ? 'Ending...' : 'End Floq'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Plans {plans.length > 0 && <Badge variant="secondary" className="ml-1">{plans.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <FloqChat floqId={floqDetails.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Activity Feed</h3>
              <p className="text-muted-foreground">
                See what's happening in your floq - member joins, messages, and more.
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <FloqPlansTab floqDetails={floqDetails} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
