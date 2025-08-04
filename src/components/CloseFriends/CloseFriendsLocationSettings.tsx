import React, { useState } from 'react';
import { 
  MapPin, 
  Target, 
  Navigation, 
  Building, 
  Globe, 
  Calendar, 
  Users, 
  Zap,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CloseFriendsLocationSettings as LocationSettings,
  CloseFriendsLocationPreferences,
  LOCATION_ACCURACY_OPTIONS,
  AUTO_SHARE_OPTIONS,
  getAccuracyLabel,
  getAutoShareLabels
} from '@/types/closeFriendsLocation';
import { 
  useUpdateCloseFriendsLocationPreferences,
  useCloseFriendsLocationSettings
} from '@/hooks/useCloseFriendsLocationSharing';
import { cn } from '@/lib/utils';

interface CloseFriendsLocationSettingsProps {
  settings: LocationSettings;
  onSettingsChange: (settings: Partial<CloseFriendsLocationPreferences>) => Promise<void>;
  className?: string;
}

export const CloseFriendsLocationSettings: React.FC<CloseFriendsLocationSettingsProps> = ({
  settings,
  onSettingsChange,
  className
}) => {
  const [accuracyLevel, setAccuracyLevel] = useState(settings.accuracy_level);
  const [autoShareWhen, setAutoShareWhen] = useState(settings.auto_share_when);
  const updatePreferences = useUpdateCloseFriendsLocationPreferences();
  const { refetch } = useCloseFriendsLocationSettings();

  const handleAccuracyChange = async (newAccuracy: 'exact' | 'approximate' | 'city') => {
    setAccuracyLevel(newAccuracy);
    
    try {
      await updatePreferences.mutateAsync({
        close_friends_location_accuracy: newAccuracy
      });
      await refetch();
      await onSettingsChange({
        close_friends_location_accuracy: newAccuracy
      });
    } catch (error) {
      console.error('Failed to update accuracy:', error);
      // Revert on error
      setAccuracyLevel(settings.accuracy_level);
    }
  };

  const handleAutoShareChange = async (option: string, checked: boolean) => {
    let newAutoWhen: string[];
    
    if (checked) {
      newAutoWhen = [...autoShareWhen, option];
    } else {
      newAutoWhen = autoShareWhen.filter(item => item !== option);
    }
    
    // Ensure at least one option is selected
    if (newAutoWhen.length === 0) {
      newAutoWhen = ['always'];
    }
    
    setAutoShareWhen(newAutoWhen);
    
    try {
      await updatePreferences.mutateAsync({
        close_friends_auto_share_when: newAutoWhen
      });
      await refetch();
      await onSettingsChange({
        close_friends_auto_share_when: newAutoWhen
      });
    } catch (error) {
      console.error('Failed to update auto share settings:', error);
      // Revert on error
      setAutoShareWhen(settings.auto_share_when);
    }
  };

  const getAccuracyIcon = (accuracy: string) => {
    switch (accuracy) {
      case 'exact':
        return <Target className="w-4 h-4" />;
      case 'city':
        return <Building className="w-4 h-4" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

  const getAutoShareIcon = (option: string) => {
    switch (option) {
      case 'always':
        return <Globe className="w-4 h-4" />;
      case 'in_floq':
        return <Zap className="w-4 h-4" />;
      case 'at_venue':
        return <Building className="w-4 h-4" />;
      case 'walking':
        return <Navigation className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Current Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Close Friends:</span>
            <Badge variant="secondary">{settings.close_friends_count}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Sharing With:</span>
            <Badge variant={settings.all_close_friends_sharing ? 'default' : 'outline'}>
              {settings.sharing_with_count} of {settings.close_friends_count}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
            <span className="font-medium">{getAccuracyLabel(settings.accuracy_level)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Location Accuracy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location Accuracy</CardTitle>
          <CardDescription>
            Choose how precise your location sharing should be
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={accuracyLevel} 
            onValueChange={handleAccuracyChange}
            className="space-y-3"
          >
            {LOCATION_ACCURACY_OPTIONS.map((option) => (
              <div key={option.value} className="space-y-2">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex items-center gap-2 flex-1">
                    {getAccuracyIcon(option.value)}
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                  {option.description}
                </p>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Auto-Share Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">When to Share</CardTitle>
          <CardDescription>
            Select when your location should be automatically shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AUTO_SHARE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-start space-x-3">
              <Checkbox
                id={option.value}
                checked={autoShareWhen.includes(option.value)}
                onCheckedChange={(checked) => 
                  handleAutoShareChange(option.value, checked as boolean)
                }
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getAutoShareIcon(option.value)}
                  <Label htmlFor={option.value} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Privacy & Security
            </h5>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p>• Location is only shared when you're actively tracking</p>
              <p>• Your location data is encrypted and never stored permanently</p>
              <p>• Close friends are automatically synced when you update them</p>
              <p>• You can disable sharing at any time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Selection Summary */}
      <Card className="bg-gray-50 dark:bg-gray-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
            <Badge variant="outline">
              {getAccuracyLabel(accuracyLevel)}
            </Badge>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400 mt-1">Sharing when:</span>
            <div className="flex flex-wrap gap-1">
              {getAutoShareLabels(autoShareWhen).map((label, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};