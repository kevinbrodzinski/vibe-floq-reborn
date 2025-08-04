import React, { useState } from 'react';
import { 
  Shield, 
  MapPin, 
  Eye, 
  EyeOff, 
  Users, 
  Settings, 
  AlertTriangle,
  Info,
  CheckCircle,
  Heart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { CloseFriendsLocationToggle } from '@/components/CloseFriends/CloseFriendsLocationToggle';
import { CloseFriendsLocationSettings } from '@/components/CloseFriends/CloseFriendsLocationSettings';
import { 
  useCloseFriendsLocationSettings,
  useCloseFriendsLocationSummary,
  useEnhancedLiveShareFriends
} from '@/hooks/useCloseFriendsLocationSharing';
import { useCloseFriends } from '@/hooks/useCloseFriends';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { cn } from '@/lib/utils';

interface CloseFriendsLocationPrivacyPanelProps {
  className?: string;
  showAdvancedSettings?: boolean;
}

export const CloseFriendsLocationPrivacyPanel: React.FC<CloseFriendsLocationPrivacyPanelProps> = ({
  className,
  showAdvancedSettings = true
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const { data: closeFriendsLocationSettings } = useCloseFriendsLocationSettings();
  const { summary } = useCloseFriendsLocationSummary();
  const { data: closeFriends = [] } = useCloseFriends();
  const { data: liveSettings } = useLiveSettings();
  const enhancedShareFriends = useEnhancedLiveShareFriends();

  const isLocationSharingActive = summary.enabled && closeFriendsLocationSettings?.enabled;
  const hasCloseFriends = closeFriends.length > 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Toggle Card */}
      <CloseFriendsLocationToggle 
        variant="card" 
        showDetails={true}
      />

      {/* Privacy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Location Privacy Overview
          </CardTitle>
          <CardDescription>
            See who can access your location and when it's shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sharing Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-500 fill-current" />
                <span className="text-sm font-medium">Close Friends</span>
              </div>
              <div className="text-lg font-bold">{closeFriends.length}</div>
              <div className="text-xs text-gray-500">Total close friends</div>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Location Sharing</span>
              </div>
              <div className="text-lg font-bold">{enhancedShareFriends.closeFriendsCount}</div>
              <div className="text-xs text-gray-500">Auto-sharing with</div>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Total Sharing</span>
              </div>
              <div className="text-lg font-bold">{enhancedShareFriends.totalCount}</div>
              <div className="text-xs text-gray-500">All location recipients</div>
            </div>
          </div>

          <Separator />

          {/* Current Status */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="w-4 h-4" />
              Current Status
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Close Friends Location Sharing:</span>
                <Badge variant={isLocationSharingActive ? 'default' : 'outline'}>
                  {isLocationSharingActive ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Location Accuracy:</span>
                <Badge variant="secondary">
                  {summary.accuracyLevel === 'exact' ? 'Exact' : 
                   summary.accuracyLevel === 'city' ? 'City Only' : 'Approximate'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">General Location Scope:</span>
                <Badge variant="outline">
                  {liveSettings?.live_scope === 'friends' ? 'Friends' : 
                   liveSettings?.live_scope === 'none' ? 'Nobody' : 
                   liveSettings?.live_scope || 'Default'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Alerts */}
      {isLocationSharingActive && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your location is being shared with {enhancedShareFriends.closeFriendsCount} close friends 
            using {summary.accuracyLevel} accuracy when you're actively tracking.
          </AlertDescription>
        </Alert>
      )}

      {!hasCloseFriends && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You don't have any close friends yet. Add close friends to enable bulk location sharing.
          </AlertDescription>
        </Alert>
      )}

      {/* Sharing Breakdown */}
      {enhancedShareFriends.totalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location Sharing Breakdown</CardTitle>
            <CardDescription>
              See how your location sharing is configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {enhancedShareFriends.closeFriendsCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-red-100 dark:bg-red-900 rounded">
                      <Heart className="w-4 h-4 text-red-500 fill-current" />
                    </div>
                    <div>
                      <div className="font-medium">Close Friends Auto-Sharing</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically shares with all close friends
                      </div>
                    </div>
                  </div>
                  <Badge variant="default">
                    {enhancedShareFriends.closeFriendsCount} friends
                  </Badge>
                </div>
              )}
              
              {enhancedShareFriends.individualCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">Individual Selections</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Manually selected friends
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {enhancedShareFriends.individualCount} friends
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      {showAdvancedSettings && isLocationSharingActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advanced Privacy Settings</CardTitle>
            <CardDescription>
              Fine-tune your location sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Advanced Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Advanced Location Sharing Settings</DialogTitle>
                  <DialogDescription>
                    Configure detailed preferences for close friends location sharing
                  </DialogDescription>
                </DialogHeader>
                {closeFriendsLocationSettings && (
                  <CloseFriendsLocationSettings 
                    settings={closeFriendsLocationSettings}
                    onSettingsChange={async () => {}}
                  />
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Privacy Tips */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Privacy Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <p>Location is only shared when you're actively tracking and meet your sharing conditions</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <p>Close friends are automatically synced - no need to manually add them to location sharing</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <p>You can adjust accuracy from exact GPS to city-level for different privacy levels</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <p>Disable sharing anytime - your location stops being shared immediately</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};