import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, User, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProximityEvent {
  id: string;
  profileId: string;
  friendName: string;
  eventType: 'enter' | 'exit' | 'sustain';
  distance: number;
  confidence: number;
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
  };
}

interface ProximityNotificationsProps {
  className?: string;
}

export const ProximityNotifications: React.FC<ProximityNotificationsProps> = ({ 
  className 
}) => {
  const [notifications, setNotifications] = useState<ProximityEvent[]>([]);

  // Mock proximity events for development
  useEffect(() => {
    const mockEvents: ProximityEvent[] = [
      {
        id: 'mock-1',
        profileId: 'friend-1',
        friendName: 'Alex',
        eventType: 'enter',
        distance: 150,
        confidence: 0.85,
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        location: { lat: 40.7128, lng: -74.0060 }
      },
      {
        id: 'mock-2', 
        profileId: 'friend-2',
        friendName: 'Sam',
        eventType: 'sustain',
        distance: 200,
        confidence: 0.72,
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        location: { lat: 40.7130, lng: -74.0062 }
      }
    ];

    setNotifications(mockEvents);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'enter':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'exit':
        return <MapPin className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4 text-blue-500" />;
    }
  };

  const getEventText = (event: ProximityEvent) => {
    const distance = Math.round(event.distance);
    switch (event.eventType) {
      case 'enter':
        return `${event.friendName} is nearby (${distance}m away)`;
      case 'exit':
        return `${event.friendName} moved away`;
      default:
        return `${event.friendName} is still nearby (${distance}m)`;
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 ${className}`}>
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <Card className="bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg max-w-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getEventIcon(notification.eventType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {getEventText(notification)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {notification.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(notification.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissNotification(notification.id)}
                    className="h-8 w-8 p-0 hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};