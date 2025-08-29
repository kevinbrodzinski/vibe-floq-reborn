import React, { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { FriendRequestManager } from '@/components/friends/FriendRequestManager';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';

export function NotificationsPage() {
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    friendRequests: true,
    messages: true,
    planUpdates: true,
    venueActivity: false,
    emailDigest: true,
  });
  const { unseen } = useEventNotifications();

  const unreadCount = unseen.length;

  const handleSettingChange = (key: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowNotificationCenter(true)}
        >
          View All
        </Button>
      </div>

      {/* Friend Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Friend Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FriendRequestManager />
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications on your device
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={notificationSettings.pushEnabled}
                onCheckedChange={(checked) => handleSettingChange('pushEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="friend-requests">Friend Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone wants to be your friend
                </p>
              </div>
              <Switch
                id="friend-requests"
                checked={notificationSettings.friendRequests}
                onCheckedChange={(checked) => handleSettingChange('friendRequests', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="messages">Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new direct messages
                </p>
              </div>
              <Switch
                id="messages"
                checked={notificationSettings.messages}
                onCheckedChange={(checked) => handleSettingChange('messages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="plan-updates">Plan Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when plans you're part of are updated
                </p>
              </div>
              <Switch
                id="plan-updates"
                checked={notificationSettings.planUpdates}
                onCheckedChange={(checked) => handleSettingChange('planUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="venue-activity">Venue Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about activity at venues you've visited
                </p>
              </div>
              <Switch
                id="venue-activity"
                checked={notificationSettings.venueActivity}
                onCheckedChange={(checked) => handleSettingChange('venueActivity', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-digest">Email Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of your activity
                </p>
              </div>
              <Switch
                id="email-digest"
                checked={notificationSettings.emailDigest}
                onCheckedChange={(checked) => handleSettingChange('emailDigest', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Center Modal */}
      <NotificationCenter />
    </div>
  );
}