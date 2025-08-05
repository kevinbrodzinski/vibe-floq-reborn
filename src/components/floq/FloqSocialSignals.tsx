import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Users, 
  Zap, 
  TrendingUp, 
  Target,
  Star,
  Activity,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Clock,
  MapPin,
  Sparkles,
  Crown,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarUrl, getInitials } from '@/lib/avatar';

interface SocialSignal {
  id: string;
  type: 'reaction' | 'message' | 'join' | 'vibe_change' | 'activity' | 'mention';
  user: {
    id: string;
    name: string;
    avatar_url?: string;
    username: string;
  };
  content?: string;
  timestamp: Date;
  metadata?: any;
}

interface FloqSocialSignalsProps {
  floqId: string;
  className?: string;
}

export const FloqSocialSignals: React.FC<FloqSocialSignalsProps> = ({ 
  floqId, 
  className 
}) => {
  // Mock social signals data (in real app, this would come from real-time events)
  const socialSignals = useMemo(() => {
    const signals: SocialSignal[] = [
      {
        id: '1',
        type: 'reaction',
        user: {
          id: 'user1',
          name: 'Sarah Chen',
          username: 'sarahchen',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah'
        },
        content: '❤️',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        metadata: { reaction: 'heart', messageId: 'msg1' }
      },
      {
        id: '2',
        type: 'message',
        user: {
          id: 'user2',
          name: 'Alex Rivera',
          username: 'alexrivera',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex'
        },
        content: 'This vibe is amazing! 🔥',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
      {
        id: '3',
        type: 'join',
        user: {
          id: 'user3',
          name: 'Maya Patel',
          username: 'mayapatel',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya'
        },
        timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
      },
      {
        id: '4',
        type: 'vibe_change',
        user: {
          id: 'user1',
          name: 'Sarah Chen',
          username: 'sarahchen',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah'
        },
        content: 'Chill → Hype',
        timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
        metadata: { oldVibe: 'chill', newVibe: 'hype' }
      },
      {
        id: '5',
        type: 'mention',
        user: {
          id: 'user4',
          name: 'Jordan Kim',
          username: 'jordankim',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan'
        },
        content: '@sarahchen check out this new spot!',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      }
    ];

    return signals;
  }, []);

  // Calculate engagement metrics
  const engagementMetrics = useMemo(() => {
    const now = new Date();
    const recentSignals = socialSignals.filter(signal => {
      const diffInMinutes = (now.getTime() - signal.timestamp.getTime()) / (1000 * 60);
      return diffInMinutes < 60; // Last hour
    });

    const reactions = recentSignals.filter(s => s.type === 'reaction').length;
    const messages = recentSignals.filter(s => s.type === 'message').length;
    const joins = recentSignals.filter(s => s.type === 'join').length;
    const vibeChanges = recentSignals.filter(s => s.type === 'vibe_change').length;

    const totalEngagement = reactions + messages + joins + vibeChanges;
    const isHighEngagement = totalEngagement >= 10;
    const isVeryHighEngagement = totalEngagement >= 20;

    return {
      reactions,
      messages,
      joins,
      vibeChanges,
      totalEngagement,
      isHighEngagement,
      isVeryHighEngagement,
      recentCount: recentSignals.length
    };
  }, [socialSignals]);

  const getSignalIcon = (type: SocialSignal['type']) => {
    switch (type) {
      case 'reaction':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'join':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'vibe_change':
        return <Zap className="w-4 h-4 text-purple-500" />;
      case 'activity':
        return <Activity className="w-4 h-4 text-orange-500" />;
      case 'mention':
        return <Target className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSignalColor = (type: SocialSignal['type']) => {
    switch (type) {
      case 'reaction':
        return 'text-red-500 bg-red-500/10';
      case 'message':
        return 'text-blue-500 bg-blue-500/10';
      case 'join':
        return 'text-green-500 bg-green-500/10';
      case 'vibe_change':
        return 'text-purple-500 bg-purple-500/10';
      case 'activity':
        return 'text-orange-500 bg-orange-500/10';
      case 'mention':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getSignalDescription = (signal: SocialSignal) => {
    switch (signal.type) {
      case 'reaction':
        return `reacted with ${signal.content}`;
      case 'message':
        return 'sent a message';
      case 'join':
        return 'joined the floq';
      case 'vibe_change':
        return `changed vibe to ${signal.metadata?.newVibe || 'new vibe'}`;
      case 'activity':
        return 'is active';
      case 'mention':
        return 'mentioned someone';
      default:
        return 'interacted';
    }
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes === 1) return '1 minute ago';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  return (
    <Card className={cn("p-4", className)}>
      {/* Header with engagement metrics */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Social Signals</h3>
          <Badge variant="secondary" className="text-xs">
            {socialSignals.length} signals
          </Badge>
        </div>
        
        {/* Engagement Score */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {engagementMetrics.isVeryHighEngagement && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                <span className="text-xs font-medium text-purple-500">VIBING</span>
              </motion.div>
            )}
            {engagementMetrics.isHighEngagement && !engagementMetrics.isVeryHighEngagement && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-green-500">ENGAGED</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {engagementMetrics.recentCount} recent
            </span>
          </div>
        </div>
      </div>

      {/* Engagement Metrics Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-red-500/10">
          <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <div className="text-xs font-medium">{engagementMetrics.reactions}</div>
          <div className="text-[10px] text-muted-foreground">Reactions</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-blue-500/10">
          <MessageCircle className="w-4 h-4 text-blue-500 mx-auto mb-1" />
          <div className="text-xs font-medium">{engagementMetrics.messages}</div>
          <div className="text-[10px] text-muted-foreground">Messages</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-green-500/10">
          <UserPlus className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <div className="text-xs font-medium">{engagementMetrics.joins}</div>
          <div className="text-[10px] text-muted-foreground">Joins</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-purple-500/10">
          <Zap className="w-4 h-4 text-purple-500 mx-auto mb-1" />
          <div className="text-xs font-medium">{engagementMetrics.vibeChanges}</div>
          <div className="text-[10px] text-muted-foreground">Vibe Changes</div>
        </div>
      </div>

      {/* Social Signals List */}
      <div className="space-y-3">
        {socialSignals.map((signal) => {
          const isRecent = new Date().getTime() - signal.timestamp.getTime() < 5 * 60 * 1000; // Last 5 minutes
          
          return (
            <div
              key={signal.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                isRecent && "bg-muted/30 border-primary/20"
              )}
            >
              <div className={cn("p-1.5 rounded-lg", getSignalColor(signal.type))}>
                {getSignalIcon(signal.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={getAvatarUrl(signal.user.avatar_url, 24)} />
                    <AvatarFallback className="text-xs">
                      {getInitials(signal.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {signal.user.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getSignalDescription(signal)}
                  </span>
                </div>
                
                {signal.content && (
                  <div className="mt-1 text-sm text-foreground">
                    {signal.content}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(signal.timestamp)}
                  </div>
                  {isRecent && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-green-500 font-medium">LIVE</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}; 