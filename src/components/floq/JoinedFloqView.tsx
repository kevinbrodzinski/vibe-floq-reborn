
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { FloqActivityStream } from '@/components/floq/FloqActivityStream';
import { FloqMemberList } from '@/components/floq/FloqMemberList';
import { FloqPlansTab } from '@/components/floq/FloqPlansTab';
import { FloqChat } from '@/components/floq/FloqChat';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { MapPin, MessageCircle, Users, Calendar, ExternalLink, Zap, ClipboardList } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('plans');

  const isHost = floqDetails.creator_id === session?.user?.id;

  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight truncate">{floqDetails.title}</h1>
            {floqDetails.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{floqDetails.description}</p>
            )}
          </div>
          
          <div className="flex gap-1 shrink-0">
            {onEndFloq && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onEndFloq}
                disabled={isEndingFloq}
                className="text-xs px-2 py-1 h-7"
              >
                {isEndingFloq ? 'Ending...' : 'End'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLeave}
              disabled={isLeaving}
              className="text-xs px-3 py-1 h-7"
            >
              {isLeaving ? 'Leaving...' : 'Leave'}
            </Button>
          </div>
        </div>

        {/* Stats - Mobile optimized */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Users className="h-3 w-3 shrink-0" />
            <span>{floqDetails.participants?.length || 0} members</span>
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>Started {formatDistanceToNow(new Date(floqDetails.starts_at))} ago</span>
          </div>
          {floqDetails.ends_at && (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Zap className="h-3 w-3 shrink-0" />
              <span>Ends about {formatDistanceToNow(new Date(floqDetails.ends_at))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs - Mobile optimized */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-10">
          <TabsTrigger value="plans" className="text-xs px-1 flex items-center gap-1">
            <ClipboardList className="h-3 w-3 shrink-0" />
            <span className="hidden xs:inline">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs px-1 flex items-center gap-1">
            <MessageCircle className="h-3 w-3 shrink-0" />
            <span className="hidden xs:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs px-1 flex items-center gap-1 relative">
            <Users className="h-3 w-3 shrink-0" />
            <span className="hidden xs:inline">Members</span>
            {members.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1 py-0.5 min-w-[16px] h-4 flex items-center justify-center leading-none">
                {members.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs px-1 flex items-center gap-1">
            <Zap className="h-3 w-3 shrink-0" />
            <span className="hidden xs:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-3 mt-3">
          <FloqPlansTab floqDetails={floqDetails} />
        </TabsContent>

        <TabsContent value="chat" className="mt-3">
          <FloqChat 
            floqId={floqDetails.id}
            isOpen={true}
            onClose={() => {}}
            isJoined={true}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-3">
          <ScrollArea className="h-[400px]">
            <FloqMemberList floqId={floqDetails.id} />
            <ScrollBar />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="activity" className="mt-3">
          <ScrollArea className="h-[400px]">
            <FloqActivityStream floqId={floqDetails.id} />
            <ScrollBar />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
