import { Clock, MapPin, Users, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LazyAvatar } from '@/components/ui/lazy-avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useFriends } from '@/hooks/useFriends';
import { useCrossedPathsToday } from '@/hooks/useCrossedPathsToday';

interface ActivityItem {
  id: string;
  type: 'friend_added' | 'vibe_change' | 'crossed_path' | 'venue_visit';
  timestamp: string;
  description: string;
  metadata?: {
    friend_name?: string;
    friend_avatar?: string;
    vibe?: string;
    venue_name?: string;
    person_name?: string;
  };
}

export function RecentActivity() {
  const { user } = useAuth();
  const { profiles: friendProfiles } = useFriends();
  const { crossedPaths } = useCrossedPathsToday();

  // Fetch recent activity data
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!user?.id) return [];

      const activities: ActivityItem[] = [];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Get recent vibe changes
      const { data: vibeChanges } = await supabase
        .from('vibes_log')
        .select('vibe, ts, venue_id')
        .eq('user_id', user.id)
        .gte('ts', yesterday.toISOString())
        .order('ts', { ascending: false })
        .limit(5);

      // Get recent friendships (approximate by creation date)
      const { data: recentFriends } = await supabase
        .from('friendships')
        .select(`
          friend_id,
          created_at,
          profiles!friendships_friend_id_fkey(display_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      // Add vibe changes
      vibeChanges?.forEach((change) => {
        activities.push({
          id: `vibe-${change.ts}`,
          type: 'vibe_change',
          timestamp: change.ts,
          description: `Changed vibe to ${change.vibe}`,
          metadata: { vibe: change.vibe }
        });
      });

      // Add new friends
      recentFriends?.forEach((friendship) => {
        const profile = friendship.profiles as any;
        activities.push({
          id: `friend-${friendship.created_at}`,
          type: 'friend_added',
          timestamp: friendship.created_at,
          description: `Connected with ${profile?.display_name || 'a new friend'}`,
          metadata: {
            friend_name: profile?.display_name,
            friend_avatar: profile?.avatar_url
          }
        });
      });

      // Add recent crossed paths (from today's data)
      crossedPaths.slice(0, 3).forEach((person) => {
        activities.push({
          id: `crossed-${person.user_id}`,
          type: 'crossed_path',
          timestamp: person.last_seen_ts,
          description: `Crossed paths with ${person.display_name || person.username || 'someone'}`,
          metadata: {
            person_name: person.display_name || person.username
          }
        });
      });

      // Sort by timestamp and return latest 8
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'friend_added':
        return Users;
      case 'vibe_change':
        return Zap;
      case 'crossed_path':
        return MapPin;
      case 'venue_visit':
        return MapPin;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'friend_added':
        return 'text-secondary';
      case 'vibe_change':
        return 'text-accent';
      case 'crossed_path':
        return 'text-primary';
      case 'venue_visit':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  if (isLoading) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
        <div className="space-y-3">
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

  if (activities.length === 0) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/30 text-center">
        <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground mt-1">
          Start exploring to see your activity here
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/30">
      <h3 className="text-sm font-medium mb-3 text-foreground">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => {
          const IconComponent = getActivityIcon(activity.type);
          const iconColor = getActivityColor(activity.type);

          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`mt-0.5 ${iconColor}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>

              {activity.metadata?.friend_avatar && (
                <LazyAvatar
                  avatarPath={activity.metadata.friend_avatar}
                  displayName={activity.metadata.friend_name}
                  size={24}
                  className="border border-border/40"
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}