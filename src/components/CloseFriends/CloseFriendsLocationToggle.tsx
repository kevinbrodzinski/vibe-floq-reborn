import React, { useState } from 'react';
import { MapPin, Heart, Users, Settings, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  useToggleCloseFriendsLocationSharing,
  useCloseFriendsLocationAvailability,
  useCloseFriendsLocationSummary
} from '@/hooks/useCloseFriendsLocationSharing';
import { CloseFriendsLocationSettings } from '@/components/CloseFriends/CloseFriendsLocationSettings';
import { cn } from '@/lib/utils';

interface CloseFriendsLocationToggleProps {
  variant?: 'card' | 'switch' | 'button';
  showDetails?: boolean;
  className?: string;
  onToggle?: (enabled: boolean) => void;
}

export const CloseFriendsLocationToggle: React.FC<CloseFriendsLocationToggleProps> = ({
  variant = 'card',
  showDetails = true,
  className,
  onToggle
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const { toggle, isLoading, isEnabled, settings } = useToggleCloseFriendsLocationSharing();
  const { isAvailable, canEnable, canDisable, closeFriendsCount } = useCloseFriendsLocationAvailability();
  const { summary } = useCloseFriendsLocationSummary();

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggle(enabled);
      onToggle?.(enabled);
      
      // If enabling for the first time, show settings
      if (enabled && !isEnabled) {
        setShowSettings(true);
      }
    } catch (error) {
      console.error('Error toggling close friends location sharing:', error);
    }
  };

  if (!isAvailable) {
    return (
      <Card className={cn('border-dashed border-gray-300 dark:border-gray-600', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-center">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Heart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-600 dark:text-gray-400">
                No Close Friends Yet
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Add close friends to enable location sharing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
            <MapPin className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Share with Close Friends
              </span>
              <Badge variant="secondary" className="text-xs">
                {closeFriendsCount}
              </Badge>
            </div>
            {showDetails && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {summary.statusText}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showDetails && (
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Location Sharing Settings</DialogTitle>
                  <DialogDescription>
                    Configure how you share location with close friends
                  </DialogDescription>
                </DialogHeader>
                {settings && (
                  <CloseFriendsLocationSettings 
                    settings={settings}
                    onSettingsChange={async () => {}}
                  />
                )}
              </DialogContent>
            </Dialog>
          )}
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || (!canEnable && !canDisable)}
          />
        </div>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        variant={isEnabled ? 'default' : 'outline'}
        onClick={() => handleToggle(!isEnabled)}
        disabled={isLoading || (!canEnable && !canDisable)}
        className={cn(
          'transition-all duration-200',
          isEnabled 
            ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
            : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300',
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : isEnabled ? (
          <CheckCircle className="w-4 h-4 mr-2" />
        ) : (
          <MapPin className="w-4 h-4 mr-2" />
        )}
        {isEnabled ? 'Sharing Location' : 'Share with Close Friends'}
        <Badge variant="secondary" className="ml-2 bg-white/20 text-current border-0">
          {closeFriendsCount}
        </Badge>
      </Button>
    );
  }

  // Default card variant
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
              <MapPin className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                Share Location with Close Friends
                <Badge variant="secondary">
                  {closeFriendsCount} friends
                </Badge>
              </CardTitle>
              <CardDescription>
                Automatically share your location with all close friends
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading || (!canEnable && !canDisable)}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className={cn(
          'p-3 rounded-lg border',
          isEnabled 
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
        )}>
          <div className="flex items-center gap-2">
            {isEnabled ? (
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-gray-500" />
            )}
            <span className={cn(
              'text-sm font-medium',
              isEnabled 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-gray-600 dark:text-gray-400'
            )}>
              {summary.statusText}
            </span>
          </div>
        </div>

        {/* Settings Button */}
        {isEnabled && showDetails && (
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Configure Location Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Close Friends Location Settings</DialogTitle>
                <DialogDescription>
                  Configure accuracy and sharing preferences for your close friends
                </DialogDescription>
              </DialogHeader>
              {settings && (
                <CloseFriendsLocationSettings 
                  settings={settings}
                  onSettingsChange={async () => {}}
                />
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Location is shared only when you're actively tracking</p>
          <p>• Close friends are automatically added/removed as you update them</p>
          <p>• You can adjust accuracy and sharing conditions in settings</p>
        </div>
      </CardContent>
    </Card>
  );
};