import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import type { Insert } from '@/types/util';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Waves, Users, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { getVibeIcon } from '@/utils/vibeIcons';
import { VIBE_COLORS } from '@/lib/vibes';
import type { Vibe } from '@/lib/vibes';

interface VibeState {
  id?: string;
  vibe: Vibe;
  visibility: 'public' | 'friends' | 'private';
  is_broadcasting: boolean;
  expires_at?: string;
}

interface VibeSelectorProps {
  currentLocation?: { lat: number; lng: number };
  onVibeChange?: (vibe: Vibe) => void;
}

export const VibeSelector: React.FC<VibeSelectorProps> = ({ 
  currentLocation, 
  onVibeChange 
}) => {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [selectedVibe, setSelectedVibe] = useState<Vibe>('chill');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('friends');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastDuration, setBroadcastDuration] = useState<'30min' | '1hour' | '2hours' | '4hours'>('1hour');

  const vibes: Vibe[] = [
    'chill', 'social', 'hype', 'curious', 'romantic', 
    'weird', 'flowing', 'open', 'down', 'solo',
    'energetic', 'excited', 'focused'
  ];

  // Set user vibe state
  const setVibeMutation = useMutation({
    mutationFn: async (vibeState: Omit<VibeState, 'id'>) => {
      type UvsInsert = Insert<'user_vibe_states'>;
      
      const row: UvsInsert = {
        profile_id: currentUserId as UvsInsert['profile_id'],
        active: true,
        started_at: new Date().toISOString() as UvsInsert['started_at'],
        vibe_tag: vibeState.vibe,
        gh5: null,
        location: null,
        visible_to: vibeState.visibility as UvsInsert['visible_to'],
        vibe_h: null,
        vibe_s: null,
        vibe_l: null,
      };

      const { error } = await supabase
        .from('user_vibe_states')
        .upsert([row] as UvsInsert[]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-vibe-state'] });
      toast.success('Vibe updated!');
    },
    onError: () => {
      toast.error('Failed to update vibe');
    }
  });

  // Broadcast presence with vibe
  const broadcastPresenceMutation = useMutation({
    mutationFn: async () => {
      if (!currentLocation) {
        throw new Error('Location required for broadcasting');
      }

      const expiresAt = new Date();
      const durationHours = {
        '30min': 0.5,
        '1hour': 1,
        '2hours': 2,
        '4hours': 4
      }[broadcastDuration];
      
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      const { error } = await supabase.rpc('upsert_presence', {
        p_lat: currentLocation.lat,
        p_lng: currentLocation.lng,
        p_vibe: selectedVibe,
        p_visibility: visibility
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nearby-presence'] });
      toast.success('Now broadcasting your vibe!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to broadcast vibe');
    }
  });

  const handleVibeSelect = (vibe: Vibe) => {
    setSelectedVibe(vibe);
    onVibeChange?.(vibe);
    
    // Update vibe state
    setVibeMutation.mutate({
      vibe,
      visibility,
      is_broadcasting: isBroadcasting,
      expires_at: isBroadcasting ? 
        new Date(Date.now() + getDurationMs(broadcastDuration)).toISOString() : 
        undefined
    });
  };

  const handleBroadcastToggle = (enabled: boolean) => {
    setIsBroadcasting(enabled);
    
    if (enabled && currentLocation) {
      broadcastPresenceMutation.mutate();
    }
    
    // Update vibe state
    setVibeMutation.mutate({
      vibe: selectedVibe,
      visibility,
      is_broadcasting: enabled,
      expires_at: enabled ? 
        new Date(Date.now() + getDurationMs(broadcastDuration)).toISOString() : 
        undefined
    });
  };

  const getDurationMs = (duration: string) => {
    const hours = {
      '30min': 0.5,
      '1hour': 1,
      '2hours': 2,
      '4hours': 4
    }[duration as keyof typeof hours] || 1;
    
    return hours * 60 * 60 * 1000;
  };

  const getVisibilityIcon = (vis: typeof visibility) => {
    switch (vis) {
      case 'public': return <Users className="w-4 h-4" />;
      case 'friends': return <Eye className="w-4 h-4" />;
      case 'private': return <EyeOff className="w-4 h-4" />;
    }
  };

  const getVisibilityDescription = (vis: typeof visibility) => {
    switch (vis) {
      case 'public': return 'Visible to everyone nearby';
      case 'friends': return 'Visible to friends only';
      case 'private': return 'Private to you';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Vibe Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="w-5 h-5" />
            Your Current Vibe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="text-4xl p-3 rounded-full"
                style={{ backgroundColor: `${VIBE_COLORS[selectedVibe]}20` }}
              >
                {getVibeIcon(selectedVibe)}
              </div>
              <div>
                <h3 className="text-xl font-semibold capitalize">{selectedVibe}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={isBroadcasting ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    {getVisibilityIcon(visibility)}
                    {isBroadcasting ? 'Broadcasting' : 'Not broadcasting'}
                  </Badge>
                  {isBroadcasting && (
                    <Badge variant="outline">
                      {broadcastDuration}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vibe Selection Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Vibe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {vibes.map((vibe) => (
              <Button
                key={vibe}
                variant={selectedVibe === vibe ? 'default' : 'outline'}
                className="h-auto p-3 flex flex-col gap-2"
                onClick={() => handleVibeSelect(vibe)}
                style={{
                  backgroundColor: selectedVibe === vibe ? VIBE_COLORS[vibe] : undefined,
                  borderColor: VIBE_COLORS[vibe]
                }}
              >
                <span className="text-2xl">{getVibeIcon(vibe)}</span>
                <span className="text-xs capitalize">{vibe}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Broadcasting Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Broadcasting Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Broadcast Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="broadcast-toggle" className="text-base font-medium">
                Broadcast Your Vibe
              </Label>
              <p className="text-sm text-muted-foreground">
                Share your current vibe with others nearby
              </p>
            </div>
            <Switch
              id="broadcast-toggle"
              checked={isBroadcasting}
              onCheckedChange={handleBroadcastToggle}
              disabled={!currentLocation || broadcastPresenceMutation.isPending}
            />
          </div>

          {/* Visibility Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Visibility</Label>
            <Select value={visibility} onValueChange={(value: typeof visibility) => setVisibility(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div>
                      <p>Public</p>
                      <p className="text-xs text-muted-foreground">Visible to everyone nearby</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="friends">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <div>
                      <p>Friends Only</p>
                      <p className="text-xs text-muted-foreground">Visible to friends only</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    <div>
                      <p>Private</p>
                      <p className="text-xs text-muted-foreground">Just for you</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration Settings */}
          {isBroadcasting && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Broadcast Duration</Label>
              <Select value={broadcastDuration} onValueChange={(value: typeof broadcastDuration) => setBroadcastDuration(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30min">30 minutes</SelectItem>
                  <SelectItem value="1hour">1 hour</SelectItem>
                  <SelectItem value="2hours">2 hours</SelectItem>
                  <SelectItem value="4hours">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!currentLocation && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Location access required to broadcast your vibe
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};