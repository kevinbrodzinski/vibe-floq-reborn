import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, User, MessageCircle, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const { unseen, markAsSeen } = useEventNotifications();
  const notifications = unseen; // Use the correct property name
  const { handleNotificationTap } = useNotificationActions();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.seen_at
  );

  const unreadCount = notifications.filter(n => !n.seen_at).length;

  const getNotificationIcon = (kind: string) => {
    switch (kind) {
      case 'friend_request':
      case 'friend_accepted':
        return User;
      case 'dm':
      case 'dm_reaction':
        return MessageCircle;
      case 'plan_invite':
      case 'plan_update':
        return Calendar;
      case 'venue_activity':
        return MapPin;
      default:
        return Bell;
    }
  };

  const getNotificationTitle = (notification: any) => {
    switch (notification.kind) {
      case 'friend_request':
        return 'New friend request';
      case 'friend_accepted':
        return 'Friend request accepted';
      case 'dm':
        return 'New message';
      case 'dm_reaction':
        return 'Message reaction';
      case 'plan_invite':
        return 'Plan invitation';
      case 'plan_update':
        return 'Plan updated';
      case 'venue_activity':
        return 'Venue activity';
      default:
        return 'Notification';
    }
  };

  const getNotificationDescription = (notification: any) => {
    const payload = notification.payload || {};
    
    switch (notification.kind) {
      case 'friend_request':
        return `${payload.sender_name || 'Someone'} wants to be your friend`;
      case 'friend_accepted':
        return `${payload.friend_name || 'Someone'} accepted your friend request`;
      case 'dm':
        return payload.preview || 'You have a new message';
      case 'dm_reaction':
        return `${payload.reactor_name} reacted with ${payload.emoji}`;
      case 'plan_invite':
        return `You're invited to "${payload.plan_title}"`;
      case 'plan_update':
        return `"${payload.plan_title}" has been updated`;
      case 'venue_activity':
        return payload.description || 'New activity at a venue you follow';
      default:
        return 'You have a new notification';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.seen_at) {
      markAsSeen([notification.id]);
    }
    handleNotificationTap(notification);
    onOpenChange(false);
  };

  const markAllAsRead = () => {
    const unreadIds = notifications
      .filter(n => !n.seen_at)
      .map(n => n.id);
    if (unreadIds.length > 0) {
      markAsSeen(unreadIds);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Notifications</h2>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                >
                  Unread
                </Button>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              <AnimatePresence>
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.kind);
                    const isUnread = !notification.seen_at;
                    
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            isUnread ? 'border-primary/50 bg-primary/5' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <CardContent className="p-3">
                            <div className="flex gap-3">
                              <div className="shrink-0">
                                <div className={`p-2 rounded-full ${
                                  isUnread ? 'bg-primary/10' : 'bg-muted'
                                }`}>
                                  <Icon className={`w-4 h-4 ${
                                    isUnread ? 'text-primary' : 'text-muted-foreground'
                                  }`} />
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className={`text-sm font-medium ${
                                    isUnread ? 'text-foreground' : 'text-muted-foreground'
                                  }`}>
                                    {getNotificationTitle(notification)}
                                  </h3>
                                  {isUnread && (
                                    <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {getNotificationDescription(notification)}
                                </p>
                                
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </motion.div>
  );
}