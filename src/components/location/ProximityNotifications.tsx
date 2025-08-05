import React, { useState, useEffect } from 'react';
import { Bell, Users, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEnhancedLocationSharing } from '@/hooks/location/useEnhancedLocationSharing';

interface ProximityNotification {
  id: string;
  profileId: string;
  friendName: string;
  eventType: 'enter' | 'exit' | 'sustain';
  distance: number;
  confidence: number;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * ProximityNotifications - Shows real-time proximity notifications
 * Displays when friends enter/exit proximity with enhanced context
 */
export const ProximityNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<ProximityNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const enhancedLocation = useEnhancedLocationSharing();

  // Convert proximity events to notifications
  useEffect(() => {
    if (!enhancedLocation.proximityEvents) return;

    const recentEvents = enhancedLocation.proximityEvents
      .filter(event => {
        const eventTime = event.timestamp;
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return eventTime > fiveMinutesAgo;
      })
      .map(event => ({
        id: `${event.targetProfileId}_${event.timestamp}`,
        profileId: event.targetProfileId,
        friendName: `Friend ${event.targetProfileId.slice(0, 8)}`, // Would be fetched from profiles
        eventType: event.eventType,
        distance: event.distance,
        confidence: event.confidence,
        timestamp: new Date(event.timestamp)
      }));

    setNotifications(recentEvents);
    setIsVisible(recentEvents.length > 0);
  }, [enhancedLocation.proximityEvents]);

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const dismissAll = () => {
    setNotifications([]);
    setIsVisible(false);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'enter': return <Users className="w-4 h-4 text-green-500" />;
      case 'exit': return <MapPin className="w-4 h-4 text-red-500" />;
      case 'sustain': return <Bell className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getEventMessage = (notification: ProximityNotification) => {
    const distance = Math.round(notification.distance);
    switch (notification.eventType) {
      case 'enter':
        return `${notification.friendName} is nearby (${distance}m away)`;
      case 'exit':
        return `${notification.friendName} left the area`;
      case 'sustain':
        return `Still near ${notification.friendName} (${distance}m)`;
      default:
        return `Proximity event with ${notification.friendName}`;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-500/20 text-green-500 border-green-500/30';
    if (confidence > 0.6) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    return 'bg-red-500/20 text-red-500 border-red-500/30';
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm space-y-2">
      {notifications.map(notification => (
        <Card key={notification.id} className="bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {getEventIcon(notification.eventType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {getEventMessage(notification)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs ${getConfidenceColor(notification.confidence)}`}>
                      {Math.round(notification.confidence * 100)}% confident
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {notification.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
                className="p-1 h-auto text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {notifications.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss All
          </Button>
        </div>
      )}
    </div>
  );
};