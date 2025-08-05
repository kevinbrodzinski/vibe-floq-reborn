
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Users, 
  Activity, 
  Calendar
} from 'lucide-react';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { FloqPlansTab } from './FloqPlansTab';
import { FloqMemberList } from './FloqMemberList';
import { useFloqRealtime } from '@/hooks/useFloqRealtime';
import { cn } from '@/lib/utils';
import { FloqChatPanel } from '@/components/FloqChatPanel';
import { FloqActivityFeed } from './FloqActivityFeed';
import { FloqHeader } from './FloqHeader';
import { FloqMapModal } from './FloqMapModal';
import { FloqSocialModal } from './FloqSocialModal';
import type { FloqDetails } from '@/hooks/useFloqDetails';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';

interface JoinedFloqViewProps {
  floqDetails: FloqDetails;
  onLeave: () => void;
  isLeaving: boolean;
  liveScore?: any;
  onEndFloq?: () => void;
  isEndingFloq?: boolean;
  onBack: () => void;
  onSettings?: () => void;
}

export const JoinedFloqView: React.FC<JoinedFloqViewProps> = ({
  floqDetails,
  onLeave,
  isLeaving,
  liveScore,
  onEndFloq,
  isEndingFloq,
  onBack,
  onSettings
}) => {
  const { data: members = [] } = useFloqMembers(floqDetails.id);
  const [activeTab, setActiveTab] = useState<'members' | 'chat' | 'plans' | 'activity'>('chat');
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  
  const { isConnected, connectionQuality, stats } = useFloqRealtime(floqDetails.id);

  const { user } = useAuth();
  const isHost = user?.id === floqDetails.creator_id;

  return (
    <div className="h-full flex flex-col">
      {/* New Header */}
      <FloqHeader
        floqDetails={floqDetails}
        onBack={onBack}
        onSettings={onSettings}
        onMap={() => setMapModalOpen(true)}
        onSocial={() => setSocialModalOpen(true)}
        isHost={isHost}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Plans</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Activity</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="members" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full overflow-y-auto p-2">
                <div className="h-full bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden p-3 shadow-sm">
                  <FloqMemberList floqId={floqDetails.id} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full p-2">
                <div className="h-full bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden p-3 shadow-sm">
                  <FloqChatPanel floqId={floqDetails.id} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="plans" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full overflow-y-auto p-2">
                <div className="h-full bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden p-3 shadow-sm">
                  <FloqPlansTab floqDetails={floqDetails} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="h-full overflow-y-auto p-2">
                <div className="h-full bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden p-3 shadow-sm">
                  <FloqActivityFeed floqId={floqDetails.id} />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modals */}
      <FloqMapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        floqId={floqDetails.id}
      />
      
      <FloqSocialModal
        isOpen={socialModalOpen}
        onClose={() => setSocialModalOpen(false)}
        floqId={floqDetails.id}
      />
    </div>
  );
};
