import React, { useState } from 'react';
import { Shield, Eye, EyeOff, MapPin, Activity, Calendar, Bell, Heart, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CloseFriendsPrivacySettings } from '@/types/closeFriends';

interface CloseFriendsPrivacyControlsProps {
  settings: CloseFriendsPrivacySettings;
  onSettingsChange: (settings: CloseFriendsPrivacySettings) => void;
  className?: string;
}

export const CloseFriendsPrivacyControls: React.FC<CloseFriendsPrivacyControlsProps> = ({
  settings,
  onSettingsChange,
  className,
}) => {
  const [pendingSettings, setPendingSettings] = useState(settings);

  const handleSettingChange = (key: keyof CloseFriendsPrivacySettings, value: boolean) => {
    const newSettings = { ...pendingSettings, [key]: value };
    setPendingSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const privacyOptions = [
    {
      key: 'allowCloseFriendsToSeeMyLocation' as const,
      title: 'Location Sharing',
      description: 'Allow close friends to see your location and nearby activities',
      icon: <MapPin className="w-5 h-5 text-blue-500" />,
      value: pendingSettings.allowCloseFriendsToSeeMyLocation,
    },
    {
      key: 'allowCloseFriendsToSeeMyActivity' as const,
      title: 'Activity Status',
      description: 'Show your activity status and what you\'re doing to close friends',
      icon: <Activity className="w-5 h-5 text-green-500" />,
      value: pendingSettings.allowCloseFriendsToSeeMyActivity,
    },
    {
      key: 'allowCloseFriendsToSeeMyPlans' as const,
      title: 'Future Plans',
      description: 'Share your upcoming plans and events with close friends',
      icon: <Calendar className="w-5 h-5 text-purple-500" />,
      value: pendingSettings.allowCloseFriendsToSeeMyPlans,
    },
    {
      key: 'notifyWhenAddedAsCloseFriend' as const,
      title: 'Close Friend Notifications',
      description: 'Get notified when someone adds you as a close friend',
      icon: <Bell className="w-5 h-5 text-orange-500" />,
      value: pendingSettings.notifyWhenAddedAsCloseFriend,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
            <Heart className="w-6 h-6 text-red-500 fill-current" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Close Friends Privacy
              <Shield className="w-4 h-4 text-gray-500" />
            </CardTitle>
            <CardDescription>
              Control what information your close friends can see about you
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Privacy Settings */}
        <div className="space-y-4">
          {privacyOptions.map((option, index) => (
            <div key={option.key}>
              <div className="flex items-center justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  {option.icon}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {option.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={option.value}
                  onCheckedChange={(checked) => handleSettingChange(option.key, checked)}
                  className="shrink-0"
                />
              </div>
              {index < privacyOptions.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Privacy Reminder
              </h5>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                These settings only apply to users you've marked as close friends. Regular friends 
                will continue to see information based on your general privacy settings.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allEnabled = {
                allowCloseFriendsToSeeMyLocation: true,
                allowCloseFriendsToSeeMyActivity: true,
                allowCloseFriendsToSeeMyPlans: true,
                notifyWhenAddedAsCloseFriend: true,
              };
              setPendingSettings(allEnabled);
              onSettingsChange(allEnabled);
            }}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allDisabled = {
                allowCloseFriendsToSeeMyLocation: false,
                allowCloseFriendsToSeeMyActivity: false,
                allowCloseFriendsToSeeMyPlans: false,
                notifyWhenAddedAsCloseFriend: false,
              };
              setPendingSettings(allDisabled);
              onSettingsChange(allDisabled);
            }}
            className="flex-1"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Disable All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};