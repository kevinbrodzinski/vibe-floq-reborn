/**
 * @deprecated This is test/demo code - moved to @/lib/location/mockData
 * Use the standardized mock data utilities instead
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FriendShareToggle } from '@/components/friends/FriendShareToggle';

export const LocationSharingTest: React.FC = () => {
  const [sharingCount, setSharingCount] = useState(0);
  const queryClient = useQueryClient();

  // Fetch sharing preferences
  const { data: sharePrefs, isLoading, refetch } = useQuery({
    queryKey: ['share-prefs-test'],
    queryFn: async () => {
      console.log('🔍 Fetching share prefs...');
      const { data, error } = await supabase
        .from('friend_share_pref')
        .select('other_profile_id,is_live');

      if (error) {
        console.error('❌ Error fetching share prefs:', error);
        throw error;
      }

      console.log('✅ Share prefs fetched:', data);
      return data || [];
    },
    retry: false,
  });

  // Calculate sharing count
  React.useEffect(() => {
    if (Array.isArray(sharePrefs)) {
      const count = (sharePrefs as any[]).filter((pref: any) => pref.is_live).length;
      setSharingCount(count);
      console.log('📊 Sharing count updated:', count);
    }
  }, [sharePrefs]);

  // Test function to manually add a preference
  const testAddPreference = async () => {
    console.log('🧪 Testing add preference...');
    try {
      const { error } = await supabase.rpc('set_live_share_bulk', {
        _friend_ids: ['test-friend-123'],
        _on: true,
        _auto_when: ['always']
      });

      if (error) {
        console.error('❌ Test add preference failed:', error);
      } else {
        console.log('✅ Test add preference succeeded');
        refetch(); // Refresh the data
      }
    } catch (error) {
      console.error('❌ Test add preference error:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Location Sharing Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sharing with {sharingCount} friends</p>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading...' : `${sharePrefs?.length || 0} total preferences`}
              </p>
            </div>
            <Badge variant={sharingCount > 0 ? "default" : "secondary"}>
              {sharingCount > 0 ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Test Buttons */}
          <div className="space-y-2">
            <Button onClick={testAddPreference} variant="outline">
              Test Add Preference
            </Button>
            <Button onClick={() => refetch()} variant="outline">
              Refresh Data
            </Button>
          </div>

          {/* Test Toggle */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Test Toggle (Friend ID: test-friend-123)</p>
            <FriendShareToggle friendId="test-friend-123" initial={false} />
          </div>

          {/* Debug: Raw Preferences */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Debug: Raw Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(sharePrefs, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}; 