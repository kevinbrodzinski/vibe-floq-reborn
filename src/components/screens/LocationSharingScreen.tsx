import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Users, Settings, Info, Eye, EyeOff, MapPin, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { GhostModeToggle } from '@/components/live/GhostModeToggle';
import { SmartFeatureList } from '@/components/live/SmartFeatureList';
import { FriendOverrideList } from '@/components/live/FriendOverrideList';
import { scopeOpts, whenOpts, accOpts } from '@/types/liveSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useDebouncedCallback } from 'use-debounce';

export const LocationSharingScreen: React.FC = () => {
  const { data: settings, save, isLoading } = useLiveSettings();

  // Debounced save function to prevent excessive database writes
  const debouncedSave = useDebouncedCallback(
    (patch: any) => save(patch),
    500 // 500ms delay
  );

  // Get sharing count for summary
  const { data: sharePrefs = {}, isLoading: prefsLoading } = useQuery({
    queryKey: ['share-prefs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('friend_share_pref')
        .select('friend_id,is_live');

      if (!data) return {};

      return Object.fromEntries(data.map(r => [r.friend_id, r.is_live]));
    }
  });

  const sharingCount = Object.values(sharePrefs).filter(Boolean).length;
  const isSharingAny = sharingCount > 0;

  // Guard while settings are loading
  if (isLoading || !settings) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Header with Summary */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Location Sharing</h1>
          <p className="text-muted-foreground text-lg">
            Control who can see your real-time location and when
          </p>
        </div>

        {/* Summary Card */}
        <Card className="border-pink-200 bg-pink-50/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Privacy Status</span>
            </div>
            <div className="space-y-1">
              <h2 className={`text-2xl font-bold ${isSharingAny ? 'text-green-600' : 'text-red-600'}`}>
                {isSharingAny ? 'Sharing' : 'Private'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSharingAny
                  ? `${sharingCount} friend${sharingCount === 1 ? '' : 's'} can see your location`
                  : 'No one can see your location'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ghost Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ghost Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <GhostModeToggle />
        </CardContent>
      </Card>

      {/* Who Can See */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Who Can See Your Location</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.live_scope}
            onValueChange={(value) => debouncedSave({ live_scope: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scopeOpts.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* When to Share */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">When to Share Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {whenOpts.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`when-${option.value}`}
                checked={settings.live_auto_when.includes(option.value as any)}
                onCheckedChange={(checked) => {
                  const newWhen = checked
                    ? [...settings.live_auto_when, option.value]
                    : settings.live_auto_when.filter(w => w !== option.value);
                  debouncedSave({ live_auto_when: newWhen });
                }}
              />
              <label htmlFor={`when-${option.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {option.label}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Accuracy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.live_accuracy}
            onValueChange={(value) => debouncedSave({ live_accuracy: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accOpts.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Friend Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Friend Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <FriendOverrideList />
        </CardContent>
      </Card>

      {/* Smart Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Smart Features</CardTitle>
        </CardHeader>
        <CardContent>
          <SmartFeatureList />
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="border-blue-200 bg-blue-50/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                How location sharing works
              </p>
              <p className="text-sm text-muted-foreground">
                Your location is only shared with friends you specifically enable, and you can
                turn it off at any time. Ghost mode temporarily hides your location,
                while smart features enhance your sharing experience.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 