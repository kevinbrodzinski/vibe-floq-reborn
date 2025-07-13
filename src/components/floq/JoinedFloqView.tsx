import React, { useState } from 'react';
import { Clock, MapPin, Users, UserMinus, Zap, UserPlus2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VibeRing } from '@/components/VibeRing';
import { FloqChat } from '@/components/floq/FloqChat';
import { IconPill } from '@/components/IconPill';
import { supabase } from '@/integrations/supabase/client';
import { formatDistance } from '@/utils/formatDistance';
import { cn } from '@/lib/utils';
import type { FloqDetails } from '@/hooks/useFloqDetails';

interface JoinedFloqViewProps {
  floqDetails: FloqDetails;
  onLeave: () => void;
  isLeaving: boolean;
  liveScore?: { activity_score: number };
  onEndFloq?: () => void;
  isEndingFloq?: boolean;
}

export const JoinedFloqView: React.FC<JoinedFloqViewProps> = ({
  floqDetails,
  onLeave,
  isLeaving,
  liveScore,
  onEndFloq,
  isEndingFloq = false
}) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [showInvite, setShowInvite] = useState(false);

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
      {/* Compact Hero Section */}
      <Card className="mx-4 pt-3 pb-4 px-6 bg-gradient-to-br from-card to-card/80">
        <div className="flex items-start gap-4">
          <VibeRing vibe={floqDetails.primary_vibe} className="w-12 h-12">
            <Avatar className="w-full h-full">
              <AvatarImage 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${floqDetails.title}`} 
                alt={floqDetails.title}
              />
              <AvatarFallback className="text-sm font-semibold">
                {floqDetails.title.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </VibeRing>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold mb-1">{floqDetails.title}</h2>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className="capitalize text-xs"
                style={{ borderColor: `hsl(var(--${floqDetails.primary_vibe}))` }}
              >
                {floqDetails.primary_vibe}
              </Badge>
              {floqDetails.is_creator && (
                <Badge variant="secondary" className="text-xs">Host</Badge>
              )}
              {!floqDetails.ends_at && (
                <Badge className="bg-persistent text-persistent-foreground text-xs">
                  Ongoing
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{floqDetails.participant_count}</span>
              </div>
              
              {floqDetails.starts_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeFromNow(floqDetails.starts_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Leave Button (compact) */}
          {!floqDetails.is_creator && (
            <Button
              onClick={onLeave}
              disabled={isLeaving}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              {isLeaving ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Tabbed Interface */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          {/* Action Pills Row */}
          <div className="flex gap-2 mt-4 mb-4">
            {/* End Floq for persistent hosts only */}
            {floqDetails.is_creator && !floqDetails.ends_at && onEndFloq && (
              <IconPill
                icon={<X className="w-3 h-3" />}
                label="End Floq"
                onClick={onEndFloq}
                disabled={isEndingFloq}
                variant="destructive"
                className="border-destructive"
              />
            )}
            
            {/* Boost available to all joined members */}
            <IconPill
              icon={<Zap className="w-3 h-3" />}
              label="Boost"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.rpc('boost_floq', { 
                    p_floq_id: floqDetails.id 
                  });
                  
                  if (error) throw error;
                  
                  console.log('Floq boosted successfully');
                } catch (error) {
                  console.error('Failed to boost floq:', error);
                }
              }}
            />
            
            {/* Invite available to all joined members */}
            <IconPill
              icon={<UserPlus2 className="w-3 h-3" />}
              label="Invite"
              onClick={() => setShowInvite(true)}
            />
          </div>

          <TabsContent value="chat" className="mt-0">
            <Card className="h-[400px] flex flex-col">
              <FloqChat 
                floqId={floqDetails.id}
                isOpen={true}
                onClose={() => {}}
                isJoined={true}
              />
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <Card className="p-4">
              <div className="text-center py-8">
                <h3 className="font-semibold mb-2">Activity Feed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  See who joined and what's happening in your floq
                </p>
                <div className="text-xs text-muted-foreground">
                  Coming soon: Join events, boosts, and more
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="mt-0">
            <Card className="p-4">
              <div className="text-center py-8">
                <h3 className="font-semibold mb-2">Plans</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Coordinate activities and future meetups
                </p>
                <div className="text-xs text-muted-foreground">
                  Coming soon: Plan coordination tools
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom padding for scroll clearance */}
      <div className="pb-8" />
    </div>
  );
};