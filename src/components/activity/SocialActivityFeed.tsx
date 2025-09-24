import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  Star,
  Coffee,
  Music,
  Camera
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'checkin' | 'review' | 'plan_created' | 'friend_joined' | 'vibe_update' | 'photo_shared';
  profileId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  location?: {
    name: string;
    type: string;
  };
  metadata?: {
    rating?: number;
    vibe?: string;
    planTitle?: string;
    photoUrl?: string;
    participants?: number;
  };
  interactions: {
    likes: number;
    comments: number;
    liked: boolean;
  };
}

// Mock activity data - in real app this would come from your API
const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'checkin',
    profileId: 'user1',
    userName: 'Sarah Chen',
    userAvatar: '',
    content: 'Just arrived at this amazing coffee shop! Perfect spot for morning work.',
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    location: {
      name: 'Blue Bottle Coffee',
      type: 'cafe'
    },
    metadata: {
      vibe: 'focused'
    },
    interactions: {
      likes: 5,
      comments: 2,
      liked: false
    }
  },
  {
    id: '2',
    type: 'review',
    profileId: 'user2',
    userName: 'Mike Rodriguez',
    userAvatar: '',
    content: 'Outstanding brunch experience! The avocado toast was incredible and the service was top-notch.',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    location: {
      name: 'Sunny Side Cafe',
      type: 'restaurant'
    },
    metadata: {
      rating: 5
    },
    interactions: {
      likes: 12,
      comments: 4,
      liked: true
    }
  },
  {
    id: '3',
    type: 'plan_created',
    profileId: 'user3',
    userName: 'Emma Wilson',
    userAvatar: '',
    content: 'Creating a weekend food tour of the city! Who wants to join?',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    metadata: {
      planTitle: 'Weekend Food Adventure',
      participants: 6
    },
    interactions: {
      likes: 8,
      comments: 12,
      liked: false
    }
  },
  {
    id: '4',
    type: 'photo_shared',
    profileId: 'user4',
    userName: 'Alex Park',
    userAvatar: '',
    content: 'The sunset view from this rooftop bar is absolutely stunning! 🌅',
    timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    location: {
      name: 'Sky Lounge',
      type: 'bar'
    },
    metadata: {
      photoUrl: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400',
      vibe: 'relaxed'
    },
    interactions: {
      likes: 23,
      comments: 7,
      liked: true
    }
  }
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'checkin': return MapPin;
    case 'review': return Star;
    case 'plan_created': return Calendar;
    case 'friend_joined': return Users;
    case 'vibe_update': return Coffee;
    case 'photo_shared': return Camera;
    default: return MapPin;
  }
};

const getVibeEmoji = (vibe: string) => {
  const vibeEmojis: Record<string, string> = {
    social: '🤝',
    creative: '🎨',
    focused: '🎯',
    relaxed: '😌',
    energetic: '⚡',
    curious: '🤔',
    excited: '🎉',
  };
  return vibeEmojis[vibe] || '💭';
};

export function SocialActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [filter, setFilter] = useState<'all' | 'friends' | 'nearby'>('all');
  const { toast } = useToast();

  const handleLike = (activityId: string) => {
    setActivities(prev => prev.map(activity => {
      if (activity.id === activityId) {
        const wasLiked = activity.interactions.liked;
        return {
          ...activity,
          interactions: {
            ...activity.interactions,
            liked: !wasLiked,
            likes: wasLiked ? activity.interactions.likes - 1 : activity.interactions.likes + 1
          }
        };
      }
      return activity;
    }));
  };

  const filteredActivities = activities.filter(activity => {
    switch (filter) {
      case 'friends':
        // In real app, filter by friendship status
        return true;
      case 'nearby':
        // In real app, filter by location proximity
        return activity.location;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
          className="flex-1"
        >
          All Activity
        </Button>
        <Button
          variant={filter === 'friends' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('friends')}
          className="flex-1"
        >
          Friends
        </Button>
        <Button
          variant={filter === 'nearby' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('nearby')}
          className="flex-1"
        >
          Nearby
        </Button>
      </div>

      {/* Activities */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.userAvatar} />
                        <AvatarFallback>
                          {activity.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{activity.userName}</h4>
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        
                        <p className="text-sm mb-3">{activity.content}</p>
                        
                        {/* Location */}
                        {activity.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <MapPin className="w-3 h-3" />
                            <span>{activity.location.name}</span>
                          </div>
                        )}
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-2 mb-3">
                          {activity.metadata?.rating && (
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < activity.metadata!.rating!
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          
                          {activity.metadata?.vibe && (
                            <Badge variant="secondary" className="text-xs">
                              {getVibeEmoji(activity.metadata.vibe)} {activity.metadata.vibe}
                            </Badge>
                          )}
                          
                          {activity.metadata?.participants && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {activity.metadata.participants} people
                            </Badge>
                          )}
                        </div>
                        
                        {/* Photo */}
                        {activity.metadata?.photoUrl && (
                          <div className="mb-3">
                            <img
                              src={activity.metadata.photoUrl}
                              alt="Shared photo"
                              className="rounded-lg max-h-48 w-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Interactions */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <button
                            onClick={() => handleLike(activity.id)}
                            className={`flex items-center gap-1 transition-colors ${
                              activity.interactions.liked
                                ? 'text-red-500 hover:text-red-600'
                                : 'hover:text-foreground'
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                activity.interactions.liked ? 'fill-current' : ''
                              }`}
                            />
                            <span>{activity.interactions.likes}</span>
                          </button>
                          
                          <button className="flex items-center gap-1 hover:text-foreground">
                            <MessageCircle className="w-4 h-4" />
                            <span>{activity.interactions.comments}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No activities to show</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start exploring and connecting with friends to see activity here!
          </p>
        </div>
      )}
    </div>
  );
}