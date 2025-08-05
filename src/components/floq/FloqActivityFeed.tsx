import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Zap, 
  Clock, 
  Heart,
  MessageSquare,
  Crown,
  X,
  Trash2,
  Calendar,
  Mail,
  Activity,
  MapPin,
  Rocket,
  TrendingUp,
  Flame,
  Sparkles,
  Target,
  MessageCircle,
  ThumbsUp,
  Star,
  Eye,
  EyeOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyAvatar } from '@/components/ui/lazy-avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { Database } from '@/integrations/supabase/Database';

type FlockEventType = Database['public']['Enums']['flock_event_type_enum'];

interface FloqActivityItem {
  id: string;
  event_type: FlockEventType;
  created_at: string;
  profile_id: string | null;
  metadata: any;
  // Joined user profile data
  user_profile?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface ActivityCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  events: FloqActivityItem[];
}

interface FloqActivityFeedProps {
  floqId: string;
  className?: string;
}

export const FloqActivityFeed: React.FC<FloqActivityFeedProps> = ({ 
  floqId, 
  className 
}) => {
  const { user } = useAuth();
  
  // Note: Activity tracking is now handled by parent component (JoinedFloqView)
  // to ensure it fires when tab becomes visible, not just on mount
  const { data: activities = [], isLoading, error, refetch } = useQuery({
    queryKey: ['floq-activity-feed', floqId],
    queryFn: async (): Promise<FloqActivityItem[]> => {
      const { data, error } = await supabase
        .from('flock_history')
        .select(`
          id,
          event_type,
          created_at,
          profile_id,
          metadata,
          profiles:profiles!profile_id(display_name, username, avatar_url)
        `)
        .eq('floq_id', floqId)
        .order('created_at', { ascending: false })
        .limit(50)
        .throwOnError();

      return (data || []).map(item => ({
        ...item as any,
        user_profile: (item as any).profiles ? {
          display_name: ((item as any).profiles as any).display_name || 'Unknown',
          username: ((item as any).profiles as any).username || 'unknown',
          avatar_url: ((item as any).profiles as any).avatar_url || null
        } : null,
      }));
    },
    enabled: !!floqId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    refetchIntervalInBackground: false, // Mobile battery optimization
  });

  // Set up real-time subscription for new activity events
  useEffect(() => {
    if (!floqId) return;

    console.log('Setting up real-time subscription for floq activity:', floqId);
    
    const channel = supabase
      .channel(`flock-history-${floqId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flock_history',
          filter: `floq_id=eq.${floqId}`
        },
        (payload) => {
          console.log('Real-time activity event received:', payload);
          // Refetch the activity data to get the latest events with profile data
          refetch();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [floqId, refetch]);

  // Smart categorization of activities
  const categorizedActivities = useMemo(() => {
    const categories: ActivityCategory[] = [
      {
        id: 'social',
        name: 'Social Activity',
        icon: Users,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        events: []
      },
      {
        id: 'planning',
        name: 'Planning & Events',
        icon: Calendar,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        events: []
      },
      {
        id: 'vibe',
        name: 'Vibe Changes',
        icon: Sparkles,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        events: []
      },
      {
        id: 'management',
        name: 'Management',
        icon: Crown,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        events: []
      }
    ];

    // Ensure activities is an array before processing
    const activitiesArray = Array.isArray(activities) ? activities : [];

    activitiesArray.forEach(activity => {
      switch (activity.event_type) {
        case 'joined':
        case 'left':
        case 'invited':
          categories[0].events.push(activity); // Social
          break;
        case 'plan_created':
        case 'activity_detected':
          categories[1].events.push(activity); // Planning
          break;
        case 'vibe_changed':
          categories[2].events.push(activity); // Vibe
          break;
        case 'created':
        case 'boosted':
        case 'merged':
        case 'split':
        case 'ended':
        case 'deleted':
          categories[3].events.push(activity); // Management
          break;
        default:
          categories[0].events.push(activity); // Default to social
      }
    });

    return categories.filter(cat => cat.events.length > 0);
  }, [activities]);

  // Calculate activity score and hot periods
  const activityScore = useMemo(() => {
    const now = new Date();
    const activitiesArray = Array.isArray(activities) ? activities : [];
    const recentActivities = activitiesArray.filter(activity => {
      const activityTime = new Date(activity.created_at);
      const diffInMinutes = (now.getTime() - activityTime.getTime()) / (1000 * 60);
      return diffInMinutes < 60; // Last hour
    });

    const score = Math.min(recentActivities.length * 10, 100);
    const isHot = score >= 50;
    const isVeryHot = score >= 80;

    return { score, isHot, isVeryHot, recentCount: recentActivities.length };
  }, [activities]);

  const getEventIcon = (eventType: FlockEventType) => {
    switch (eventType) {
      case 'joined':
        return <UserPlus className="w-4 h-4" />;
      case 'left':
        return <UserMinus className="w-4 h-4" />;
      case 'created':
        return <Crown className="w-4 h-4" />;
      case 'vibe_changed':
        return <Zap className="w-4 h-4" />;
      case 'activity_detected':
        return <Activity className="w-4 h-4" />;
      case 'location_changed':
        return <MapPin className="w-4 h-4" />;
      case 'merged':
      case 'split':
        return <Users className="w-4 h-4" />;
      case 'ended':
        return <X className="w-4 h-4" />;
      case 'deleted':
        return <Trash2 className="w-4 h-4" />;
      case 'boosted':
        return <Rocket className="w-4 h-4" />;
      case 'plan_created':
        return <Calendar className="w-4 h-4" />;
      case 'invited':
        return <Mail className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType: FlockEventType) => {
    switch (eventType) {
      case 'joined':
        return 'text-green-500';
      case 'left':
        return 'text-muted-foreground';
      case 'created':
        return 'text-primary';
      case 'vibe_changed':
        return 'text-purple-500';
      case 'activity_detected':
        return 'text-blue-500';
      case 'location_changed':
        return 'text-blue-500';
      case 'merged':
      case 'split':
        return 'text-orange-500';
      case 'ended':
        return 'text-red-500';
      case 'deleted':
        return 'text-red-500';
      case 'boosted':
        return 'text-yellow-500';
      case 'plan_created':
        return 'text-green-500';
      case 'invited':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getEventDescription = (activity: FloqActivityItem) => {
    const userName = activity.user_profile?.display_name || 
                     activity.user_profile?.username || 
                     'Someone';

    switch (activity.event_type) {
      case 'joined':
        return `${userName} joined the floq`;
      case 'left':
        return `${userName} left the floq`;
      case 'created':
        return `${userName} created this floq`;
      case 'vibe_changed':
        const metadata = activity.metadata || {};
        const newVibe = metadata.new_vibe;
        if (newVibe) {
          return `${userName} changed vibe to ${newVibe}`;
        }
        return `${userName} changed the vibe`;
      case 'activity_detected':
        return `${userName} is active`;
      case 'location_changed':
        return `${userName} moved location`;
      case 'merged':
        return `This floq was merged`;
      case 'split':
        return `This floq was split`;
      case 'ended':
        return `${userName} ended the floq`;
      case 'deleted':
        return `${userName} deleted the floq`;
      case 'boosted':
        return `${userName} boosted this floq`;
      case 'plan_created':
        return `${userName} created a plan`;
      case 'invited':
        return `${userName} invited someone to join`;
      default:
        return `${userName} ${activity.event_type}`;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

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

  if (isLoading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="space-y-3">
          <h3 className="text-sm font-medium mb-3">Activity Feed</h3>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-center py-4">
          <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load activity</p>
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex flex-col items-center py-12 text-muted">
          <span className="text-4xl">🎯</span>
          <p className="mt-2">No activity yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      {/* Header with activity score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Activity Feed</h3>
          <Badge variant="secondary" className="text-xs">
            {activities.length} events
          </Badge>
        </div>
        
        {/* Activity Score Indicator */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {activityScore.isVeryHot && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-500">ON FIRE</span>
              </motion.div>
            )}
            {activityScore.isHot && !activityScore.isVeryHot && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-500">HOT</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {activityScore.recentCount} recent
            </span>
          </div>
        </div>
      </div>
      
      {/* Categorized Activity Sections */}
      <div className="space-y-4">
        {categorizedActivities.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            {/* Category Header */}
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", category.bgColor)}>
                <category.icon className={cn("w-4 h-4", category.color)} />
              </div>
              <h4 className="text-sm font-medium">{category.name}</h4>
              <Badge variant="outline" className="text-xs">
                {category.events.length}
              </Badge>
            </div>
            
            {/* Category Events */}
            <div className="space-y-2 ml-8">
              {category.events.slice(0, 5).map((activity) => {
                const iconElement = getEventIcon(activity.event_type);
                const iconColor = getEventColor(activity.event_type);
                const isRecent = new Date(activity.created_at) > new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex items-start space-x-3 p-2 rounded-lg transition-colors",
                      isRecent && "bg-muted/30 border border-primary/20"
                    )}
                  >
                    <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
                      {iconElement}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">
                        {getEventDescription(activity)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.created_at)}
                        </p>
                        {isRecent && (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs text-green-500 font-medium">LIVE</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Show avatar for user events */}
                    {activity.user_profile && activity.event_type !== 'activity_detected' && (
                      <LazyAvatar
                        avatarPath={activity.user_profile.avatar_url}
                        displayName={activity.user_profile.display_name}
                        size={24}
                        className="border border-border/40 flex-shrink-0"
                      />
                    )}

                    {/* Show vibe badge for vibe changes */}
                    {activity.event_type === 'vibe_changed' && activity.metadata?.new_vibe && (
                      <Badge 
                        variant="outline" 
                        className="text-xs capitalize flex-shrink-0"
                      >
                        {activity.metadata.new_vibe}
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
              
              {category.events.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  +{category.events.length - 5} more events
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};