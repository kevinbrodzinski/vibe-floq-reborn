/**
 * Proximity Notifications Component
 * Shows notifications when friends are nearby using enhanced location data
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  MapPin, 
  Clock, 
  X, 
  MessageCircle,
  Navigation
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ProximityNotification {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  distance: number;
  confidence: number;
  timestamp: number;
  eventType: 'enter' | 'sustain';
  venue?: string;
}

interface ProximityNotificationsProps {
  maxVisible?: number;
  autoHideDelay?: number;
  showInDevelopment?: boolean;
}

export function ProximityNotifications({ 
  maxVisible = 3, 
  autoHideDelay = 10000,
  showInDevelopment = true 
}: ProximityNotificationsProps) {
  const [notifications, setNotifications] = useState<ProximityNotification[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  
  const { enhancedLocation } = useFieldLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get friend profile data for notifications using working RPC
  const { data: friendProfiles = {} } = useQuery({
    queryKey: ['friends-with-presence', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const { data, error } = await supabase.rpc('get_friends_with_presence');
      
      if (error) {
        console.error('Error fetching friends with presence:', error);
        return {};
      }

      return Object.fromEntries(
        (data || []).map(f => [
          f.friend_profile_id, 
          {
            id: f.friend_profile_id,
            name: f.display_name || f.username || 'Friend',
            avatar: f.avatar_url
          }
        ])
      );
    },
    enabled: !!user?.id
  });

  // Process proximity events into notifications
  useEffect(() => {
    if (!enhancedLocation.proximityEvents.length || !user?.id) return;

    const newNotifications: ProximityNotification[] = [];
    const now = Date.now();

    // Process recent proximity events
    enhancedLocation.proximityEvents.forEach((eventString, index) => {
      const eventMatch = eventString.match(/(Started|Sustained) proximity with user (\w+)(?:\s*\((\d+)s\))?/);
      
      if (eventMatch) {
        const [, action, friendId, durationStr] = eventMatch;
        const eventType = action === 'Started' ? 'enter' : 'sustain';
        
        // Skip if we've already shown this notification
        const notificationId = `${friendId}-${eventType}-${index}`;
        if (hiddenIds.has(notificationId)) return;

        // Find corresponding proximity data
        const proximityData = enhancedLocation.nearbyUsers.find(u => u.userId === friendId);
        const friendProfile = friendProfiles[friendId];
        
        if (proximityData && friendProfile && proximityData.isNear) {
          newNotifications.push({
            id: notificationId,
            friendId,
            friendName: friendProfile.name,
            friendAvatar: friendProfile.avatar,
            distance: Math.round(proximityData.distance),
            confidence: proximityData.confidence,
            timestamp: now,
            eventType,
            venue: enhancedLocation.currentVenue?.venueId
          });
        }
      }
    });

    // Add new notifications, keeping only the most recent
    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const combined = [...newNotifications, ...prev];
        return combined.slice(0, maxVisible);
      });

      // Auto-hide notifications after delay
      newNotifications.forEach(notification => {
        setTimeout(() => {
          handleHideNotification(notification.id);
        }, autoHideDelay);
      });
    }
  }, [enhancedLocation.proximityEvents, enhancedLocation.nearbyUsers, friendProfiles, user?.id, maxVisible, autoHideDelay, hiddenIds]);

  const handleHideNotification = (id: string) => {
    setHiddenIds(prev => new Set(prev).add(id));
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMessageFriend = (friendId: string) => {
    // TODO: Integrate with messaging system
    toast({
      title: 'Messaging',
      description: 'Opening message thread...',
    });
  };

  const handleGetDirections = (notification: ProximityNotification) => {
    // TODO: Integrate with maps/directions
    toast({
      title: 'Directions',
      description: `Getting directions to ${notification.friendName}...`,
    });
  };

  // Don't show in production unless specifically enabled
  if (process.env.NODE_ENV === 'production' && !showInDevelopment) {
    return null;
  }

  // Don't show if no notifications
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className="border-blue-200 bg-blue-50/95 backdrop-blur-sm shadow-lg animate-in slide-in-from-right-full duration-300"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={notification.friendAvatar} />
                <AvatarFallback>
                  {notification.friendName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {notification.eventType === 'enter' ? 'Friend Nearby!' : 'Still Close'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-auto"
                    onClick={() => handleHideNotification(notification.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <p className="text-sm text-blue-800 mb-2">
                  <strong>{notification.friendName}</strong> is about{' '}
                  <strong>{notification.distance}m</strong> away
                  {notification.venue && (
                    <span className="text-blue-600"> at {notification.venue}</span>
                  )}
                </p>
                
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                    <MapPin className="h-3 w-3 mr-1" />
                    {Math.round(notification.confidence * 100)}% confidence
                  </Badge>
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                    <Clock className="h-3 w-3 mr-1" />
                    Just now
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => handleMessageFriend(notification.friendId)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Message
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => handleGetDirections(notification)}
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}