import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, MoreVertical, Plus, Users, MessageSquare, Calendar, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FloqPlanCard } from '@/components/ui/FloqPlanCard';
import { FloqActivityFeed } from '@/components/ui/FloqActivityFeed';
import { FloqMemberList } from '@/components/ui/FloqMemberList';
import { FloqInsights } from '@/components/ui/FloqInsights';
import { cn } from '@/lib/utils';

interface FloqData {
  id: string;
  title: string;
  description?: string;
  host: {
    id: string;
    name: string;
    avatar?: string;
  };
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: 'host' | 'member' | 'moderator';
    status: 'online' | 'offline' | 'away' | 'busy';
    lastActivity: string;
    currentVibe?: string;
    location?: string;
    messageCount: number;
    isTyping?: boolean;
  }>;
  plans: Array<{
    id: string;
    title: string;
    status: 'draft' | 'published' | 'active' | 'ended';
    vibe: string;
    startTime: string;
    duration: string;
    maxParticipants: number;
    currentParticipants: number;
    location?: string;
    description?: string;
    host: {
      name: string;
      avatar?: string;
    };
    participants?: Array<{
      name: string;
      avatar?: string;
    }>;
    vibeMatch?: number;
  }>;
  activities: Array<{
    id: string;
    type: 'message' | 'join' | 'plan_created' | 'media_shared' | 'reaction' | 'location_update';
    user: {
      name: string;
      avatar?: string;
    };
    content: string;
    timestamp: string;
    metadata?: {
      planId?: string;
      planTitle?: string;
      mediaUrl?: string;
      location?: string;
      reaction?: string;
    };
  }>;
  insights: Array<{
    type: 'activity_summary' | 'trending_topic' | 'member_engagement' | 'plan_suggestion' | 'vibe_analysis';
    title: string;
    description: string;
    confidence: number;
    action?: {
      label: string;
      onClick: () => void;
    };
    metadata?: {
      memberCount?: number;
      messageCount?: number;
      topVibe?: string;
      location?: string;
      timeRange?: string;
    };
  }>;
}

interface EnhancedFloqScreenProps {
  floqId: string;
  currentUserId: string;
  onBack?: () => void;
  onShare?: () => void;
  onEditFloq?: () => void;
  onEndFloq?: () => void;
  onLeaveFloq?: () => void;
}

type TabType = 'plans' | 'chat' | 'members' | 'insights';

export const EnhancedFloqScreen: React.FC<EnhancedFloqScreenProps> = ({
  floqId,
  currentUserId,
  onBack,
  onShare,
  onEditFloq,
  onEndFloq,
  onLeaveFloq
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [floqData, setFloqData] = useState<FloqData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with real API calls
  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setFloqData({
        id: floqId,
        title: "Chilling Hard",
        description: "A place to relax and hang out",
        host: {
          id: "1",
          name: "Kevin Brodzinski",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kevin"
        },
        members: [
          {
            id: "1",
            name: "Kevin Brodzinski",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kevin",
            role: "host",
            status: "online",
            lastActivity: new Date().toISOString(),
            currentVibe: "chill",
            location: "San Francisco",
            messageCount: 15,
            isTyping: false
          }
        ],
        plans: [
          {
            id: "1",
            title: "Chill",
            status: "draft",
            vibe: "chill",
            startTime: new Date(Date.now() + 86400000).toISOString(),
            duration: "6h",
            maxParticipants: 10,
            currentParticipants: 1,
            location: "Coffee Shop",
            description: "Just chilling",
            host: {
              name: "Kevin Brodzinski",
              avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kevin"
            },
            vibeMatch: 85
          }
        ],
        activities: [
          {
            id: "1",
            type: "join",
            user: {
              name: "Kevin Brodzinski",
              avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kevin"
            },
            content: "joined the Floq",
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        insights: [
          {
            type: "activity_summary",
            title: "Getting Started",
            description: "Your Floq is new and ready for activity. Consider creating your first plan to get members engaged.",
            confidence: 0.95,
            action: {
              label: "Create Plan",
              onClick: () => setActiveTab('plans')
            },
            metadata: {
              memberCount: 1,
              messageCount: 0,
              timeRange: "Last 24 hours"
            }
          }
        ]
      });
      setIsLoading(false);
    }, 1000);
  }, [floqId]);

  const isHost = floqData?.host.id === currentUserId;
  const onlineMembers = floqData?.members.filter(m => m.status === 'online') || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-field flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Floq...</p>
        </div>
      </div>
    );
  }

  if (!floqData) {
    return (
      <div className="min-h-screen bg-gradient-field flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Floq not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-field">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-transparent">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">{floqData.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{floqData.members.length} members</span>
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                <span>{onlineMembers.length} online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 p-4 pt-0">
          {isHost ? (
            <>
              <Button variant="outline" size="sm" onClick={onEditFloq}>
                Edit Floq
              </Button>
              <Button variant="destructive" size="sm" onClick={onEndFloq}>
                End Floq
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onLeaveFloq}>
              Leave Floq
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-around p-4 border-b border-border/30 bg-background/60">
        {[
          { key: 'plans', icon: Calendar, label: 'Plans' },
          { key: 'chat', icon: MessageSquare, label: 'Chat' },
          { key: 'members', icon: Users, label: 'Members' },
          { key: 'insights', icon: Zap, label: 'Insights' }
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as TabType)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'plans' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Plans & Events</h2>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-1" />
                    Create
                  </Button>
                </div>
                
                {floqData.plans.length > 0 ? (
                  <div className="space-y-4">
                    {floqData.plans.map((plan) => (
                      <FloqPlanCard
                        key={plan.id}
                        plan={plan}
                        isHost={isHost}
                        onEdit={(planId) => console.log('Edit plan:', planId)}
                        onPublish={(planId) => console.log('Publish plan:', planId)}
                        onJoin={(planId) => console.log('Join plan:', planId)}
                        onShare={(planId) => console.log('Share plan:', planId)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No plans yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Create your first plan to get started
                    </p>
                    <Button>
                      <Plus className="w-4 h-4 mr-1" />
                      Create Plan
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <FloqActivityFeed
                activities={floqData.activities}
                onSendMessage={(message) => console.log('Send message:', message)}
                onJoinPlan={(planId) => console.log('Join plan from chat:', planId)}
                onReact={(activityId, reaction) => console.log('React:', activityId, reaction)}
                onShare={(activityId) => console.log('Share activity:', activityId)}
                className="h-[calc(100vh-200px)]"
              />
            )}

            {activeTab === 'members' && (
              <FloqMemberList
                members={floqData.members}
                currentUserId={currentUserId}
                onMessageMember={(memberId) => console.log('Message member:', memberId)}
                onViewProfile={(memberId) => console.log('View profile:', memberId)}
                onManageRole={(memberId, role) => console.log('Manage role:', memberId, role)}
              />
            )}

            {activeTab === 'insights' && (
              <FloqInsights
                insights={floqData.insights}
                onAction={(action) => console.log('Insight action:', action)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}; 