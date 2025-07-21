
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PublicFloqPreview } from '@/components/floq/PublicFloqPreview';
import { FloqActivityStream } from '@/components/floq/FloqActivityStream';
import { FloqMemberList } from '@/components/floq/FloqMemberList';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { MapPin, MessageCircle, Users, Calendar, ExternalLink, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JoinedFloqViewProps {
  floqDetails: any;
  onLeave: () => void;
  isLeaving: boolean;
  liveScore?: any;
  onEndFloq?: () => void;
  isEndingFloq?: boolean;
}

export const JoinedFloqView: React.FC<JoinedFloqViewProps> = ({
  floqDetails,
  onLeave,
  isLeaving,
  liveScore,
  onEndFloq,
  isEndingFloq
}) => {
  const { session } = useAuth();
  const { data: members = [] } = useFloqMembers(floqDetails.id);
  const [activeTab, setActiveTab] = useState('overview');

  const isHost = floqDetails.creator_id === session?.user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{floqDetails.title}</h1>
            {floqDetails.description && (
              <p className="text-muted-foreground">{floqDetails.description}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            {onEndFloq && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onEndFloq}
                disabled={isEndingFloq}
              >
                {isEndingFloq ? 'Ending...' : 'End Floq'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLeave}
              disabled={isLeaving}
            >
              {isLeaving ? 'Leaving...' : 'Leave'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{floqDetails.participants?.length || 0} members</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Started {formatDistanceToNow(new Date(floqDetails.starts_at))} ago</span>
          </div>
          {floqDetails.ends_at && (
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>Ends {formatDistanceToNow(new Date(floqDetails.ends_at))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members" className="relative">
            Members
            {members.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                {members.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <PublicFloqPreview
            floqDetails={floqDetails}
            onJoin={() => {}}
            isJoining={false}
            liveScore={liveScore}
            showJoinButton={false}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <ScrollArea className="h-[400px]">
            <FloqMemberList floqId={floqDetails.id} />
            <ScrollBar />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ScrollArea className="h-[400px]">
            <FloqActivityStream floqId={floqDetails.id} />
            <ScrollBar />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
