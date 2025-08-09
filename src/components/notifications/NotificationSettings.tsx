import React from 'react';
import { Bell, MessageCircle, UserPlus, Calendar, MapPin, Trophy, Settings, TestTube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationSettings = () => {
  const { 
    preferences, 
    updatePreferences, 
    stats,
    testNotification,
    hasPermission,
    isSupported 
  } = useNotifications();

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handleTestNotification = () => {
    testNotification('system_announcement');
  };

  const settingsGroups = [
    {
      title: "Social Notifications",
      description: "Messages and friend interactions",
      icon: <MessageCircle className="w-5 h-5" />,
      settings: [
        {
          key: 'dm' as const,
          label: "Direct Messages",
          description: "New messages from friends",
          count: stats.dmCount
        },
        {
          key: 'friend_requests' as const,
          label: "Friend Requests",
          description: "New friend requests and responses",
          count: stats.friendRequestCount
        },
        {
          key: 'mentions' as const,
          label: "Mentions",
          description: "When someone mentions you in a floq",
          count: 0 // Mentions are included in floq count
        }
      ]
    },
    {
      title: "Plans & Events",
      description: "Plan invitations and updates",
      icon: <Calendar className="w-5 h-5" />,
      settings: [
        {
          key: 'plan_invites' as const,
          label: "Plan Invitations",
          description: "Invites to join plans and responses",
          count: stats.planCount
        }
      ]
    },
    {
      title: "Floqs & Location",
      description: "Location-based social interactions",
      icon: <MapPin className="w-5 h-5" />,
      settings: [
        {
          key: 'floq_invites' as const,
          label: "Floq Invitations",
          description: "Invites to join floqs and responses",
          count: stats.floqCount
        },
        {
          key: 'reactions' as const,
          label: "Reactions & Replies",
          description: "Reactions and replies to your messages",
          count: 0 // Included in floq count
        }
      ]
    },
    {
      title: "Achievements & Progress",
      description: "Personal milestones and achievements",
      icon: <Trophy className="w-5 h-5" />,
      settings: [
        {
          key: 'achievements' as const,
          label: "Achievements",
          description: "Unlocked achievements and milestones",
          count: stats.achievementCount
        }
      ]
    },
    {
      title: "System Notifications",
      description: "App updates and announcements",
      icon: <Settings className="w-5 h-5" />,
      settings: [
        {
          key: 'system' as const,
          label: "System Updates",
          description: "Important announcements and feature updates",
          count: 0
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">
          Manage how and when you receive notifications
        </p>
      </div>

      {/* Permission Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle className="text-lg">Browser Notifications</CardTitle>
            </div>
            <Badge variant={hasPermission ? "default" : "secondary"}>
              {hasPermission ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <CardDescription>
            {isSupported 
              ? hasPermission 
                ? "You'll receive browser notifications for new activities"
                : "Enable browser notifications to stay updated even when the app is closed"
              : "Browser notifications are not supported on this device"
            }
          </CardDescription>
        </CardHeader>
        {isSupported && !hasPermission && (
          <CardContent>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              Enable Browser Notifications
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Current Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Activity</CardTitle>
          <CardDescription>
            Your notification activity overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.dmCount}</div>
              <div className="text-sm text-muted-foreground">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.friendRequestCount}</div>
              <div className="text-sm text-muted-foreground">Friend Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.planCount}</div>
              <div className="text-sm text-muted-foreground">Plan Updates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.floqCount}</div>
              <div className="text-sm text-muted-foreground">Floq Activity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.achievementCount}</div>
              <div className="text-sm text-muted-foreground">Achievements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalUnread}</div>
              <div className="text-sm text-muted-foreground">Total Unread</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <div className="space-y-4">
        {settingsGroups.map((group) => (
          <Card key={group.title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {group.icon}
                <CardTitle className="text-lg">{group.title}</CardTitle>
              </div>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.settings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {setting.label}
                      </label>
                      {setting.count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {setting.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {setting.description}
                    </p>
                  </div>
                  <Switch
                    checked={preferences[setting.key]}
                    onCheckedChange={(checked) => handlePreferenceChange(setting.key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            <CardTitle className="text-lg">Test Notifications</CardTitle>
          </div>
          <CardDescription>
            Send a test notification to verify your settings are working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleTestNotification}
            variant="outline"
            className="w-full"
          >
            <TestTube className="w-4 h-4 mr-2" />
            Send Test Notification
          </Button>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Notifications help you stay connected with your friends and activities.</p>
        <p className="mt-1">You can always adjust these settings later.</p>
      </div>
    </div>
  );
};