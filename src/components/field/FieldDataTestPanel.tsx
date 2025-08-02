import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { TestPresenceButton } from './TestPresenceButton';
import { RefreshCw, Database, MapPin } from 'lucide-react';

/**
 * Test panel to verify vibes_now → field_tiles data flow
 */
export const FieldDataTestPanel: React.FC = () => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;
  const [vibesNowData, setVibesNowData] = useState<any[]>([]);
  const [fieldTilesData, setFieldTilesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testDataFlow = async () => {
    setLoading(true);
    try {
      // 1. Check vibes_now data
      console.log('[DataTest] Fetching vibes_now data...');
      const { data: vibesData, error: vibesError } = await supabase
        .from('vibes_now')
        .select('profile_id, location, vibe, h3_7, updated_at')
        .gte('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .limit(10);
      
      if (vibesError) {
        console.error('[DataTest] vibes_now error:', vibesError);
      } else {
        console.log('[DataTest] vibes_now data:', vibesData);
        setVibesNowData(vibesData || []);
      }

      // 2. Trigger field tiles refresh
      console.log('[DataTest] Triggering field tiles refresh...');
      const { data: refreshResult, error: refreshError } = await supabase.functions.invoke('refresh_field_tiles');
      
      if (refreshError) {
        console.error('[DataTest] Refresh error:', refreshError);
      } else {
        console.log('[DataTest] Refresh result:', refreshResult);
      }

      // 3. Check field_tiles data
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for refresh
      
      console.log('[DataTest] Fetching field_tiles data...');
      const { data: tilesData, error: tilesError } = await supabase
        .from('field_tiles')
        .select('tile_id, crowd_count, avg_vibe, h3_7, updated_at')
        .gt('crowd_count', 0)
        .limit(10);
      
      if (tilesError) {
        console.error('[DataTest] field_tiles error:', tilesError);
      } else {
        console.log('[DataTest] field_tiles data:', tilesData);
        setFieldTilesData(tilesData || []);
      }

    } catch (error) {
      console.error('[DataTest] Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const testPresencePublish = async () => {
    try {
      // Test publishing presence to vibes_now
      const { error } = await supabase.rpc('upsert_presence', {
        p_lat: 34.0522,
        p_lng: -118.2437,
        p_vibe: 'social',
        p_visibility: 'public'
      } as any);

      if (error) {
        console.error('[DataTest] Presence publish error:', error);
      } else {
        console.log('[DataTest] Presence published successfully');
        // Wait a moment then test data flow
        setTimeout(testDataFlow, 1000);
      }
    } catch (error) {
      console.error('[DataTest] Presence publish exception:', error);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Field Data Flow Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testDataFlow} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Test Data Flow
          </Button>
          <TestPresenceButton />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">vibes_now Data ({vibesNowData.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {vibesNowData.map((vibe, index) => (
                <div key={index} className="p-2 bg-muted rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{vibe.vibe}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {vibe.h3_7}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(vibe.updated_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {vibesNowData.length === 0 && (
                <div className="text-muted-foreground text-sm">No recent presence data</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">field_tiles Data ({fieldTilesData.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {fieldTilesData.map((tile, index) => (
                <div key={index} className="p-2 bg-muted rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge>{tile.crowd_count} people</Badge>
                    <span className="text-xs text-muted-foreground">
                      {tile.tile_id}
                    </span>
                  </div>
                  <div className="text-xs">
                    Vibe: h{tile.avg_vibe?.h || 0}° s{tile.avg_vibe?.s || 0}% l{tile.avg_vibe?.l || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tile.updated_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {fieldTilesData.length === 0 && (
                <div className="text-muted-foreground text-sm">No active field tiles</div>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Test the data flow: vibes_now → refresh_field_tiles → field_tiles → map display
        </div>
      </CardContent>
    </Card>
  );
};