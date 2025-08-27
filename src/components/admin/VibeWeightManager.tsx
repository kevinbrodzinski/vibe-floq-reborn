import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';

interface VibeWeights { 
  vibe: string; 
  w_distance: number; 
  w_rating: number; 
  w_popularity: number; 
  w_tag_match: number; 
  w_cuisine_match: number; 
  w_price_fit: number; 
  updated_at: string;
}

interface UserVibeWeights { 
  profile_id: string; 
  vibe: string; 
  weights: { 
    w_distance?: number; 
    w_rating?: number; 
    w_popularity?: number; 
    w_tag_match?: number; 
    w_cuisine_match?: number; 
    w_price_fit?: number; 
  }; 
  updated_at: string; 
}

export function VibeWeightManager() {
  const queryClient = useQueryClient();
  const [newVibe, setNewVibe] = useState('');
  const [selectedUserProfile, setSelectedUserProfile] = useState('');

  // Fetch global vibe weights
  const { data: globalWeights, isLoading: globalLoading } = useQuery<VibeWeights[]>({
    queryKey: ['globalVibeWeights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rec_vibe_weights')
        .select('*')
        .order('vibe')
        .returns<VibeWeights[]>()
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch user vibe weights
  const { data: userWeights, isLoading: userLoading } = useQuery<UserVibeWeights[]>({
    queryKey: ['userVibeWeights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rec_user_vibe_weights')
        .select('*')
        .order('profile_id, vibe')
        .returns<UserVibeWeights[]>()
      if (error) throw error;
      return data ?? [];
    },
  });

  // Update global vibe weights
  const updateGlobalWeights = useMutation({
    mutationFn: async (weights: VibeWeights) => {
      const { error } = await supabase
        .from('rec_vibe_weights')
        .update({
          w_distance: weights.w_distance,
          w_rating: weights.w_rating,
          w_popularity: weights.w_popularity,
          w_tag_match: weights.w_tag_match,
          w_cuisine_match: weights.w_cuisine_match,
          w_price_fit: weights.w_price_fit,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('vibe', weights.vibe as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalVibeWeights'] });
    },
  });

  // Add new vibe
  const addNewVibe = useMutation({
    mutationFn: async (vibe: string) => {
      const { error } = await supabase
        .from('rec_vibe_weights')
        .insert({
          vibe,
          w_distance: 0.25,
          w_rating: 0.20,
          w_popularity: 0.20,
          w_tag_match: 0.15,
          w_cuisine_match: 0.10,
          w_price_fit: 0.10,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalVibeWeights'] });
      setNewVibe('');
    },
  });

  // Delete vibe
  const deleteVibe = useMutation({
    mutationFn: async (vibe: string) => {
      const { error } = await supabase
        .from('rec_vibe_weights')
        .delete()
        .eq('vibe', vibe as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalVibeWeights'] });
    },
  });

  const WeightSlider = ({ 
    label, 
    value, 
    onChange, 
    max = 1 
  }: { 
    label: string; 
    value: number; 
    onChange: (value: number) => void; 
    max?: number;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center space-x-4">
        <Input
          type="number"
          min="0"
          max={max}
          step="0.01"
          value={value.toFixed(2)}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20"
        />
        <input
          type="range"
          min="0"
          max={max}
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-gray-500 w-12">{(value * 100).toFixed(0)}%</span>
      </div>
    </div>
  );

  const GlobalVibeEditor = ({ weights }: { weights: VibeWeights }) => {
    const [editedWeights, setEditedWeights] = useState(weights);
    const [hasChanges, setHasChanges] = useState(false);

    const handleWeightChange = (field: keyof VibeWeights, value: number) => {
      setEditedWeights(prev => ({ ...prev, [field]: value }));
      setHasChanges(true);
    };

    const handleSave = () => {
      updateGlobalWeights.mutate(editedWeights);
      setHasChanges(false);
    };

    const handleReset = () => {
      setEditedWeights(weights);
      setHasChanges(false);
    };

    const weightSum = editedWeights.w_distance + editedWeights.w_rating + 
                     editedWeights.w_popularity + editedWeights.w_tag_match + 
                     editedWeights.w_cuisine_match + editedWeights.w_price_fit;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="capitalize">{weights.vibe}</CardTitle>
            <CardDescription>
              Weight sum: {weightSum.toFixed(2)} {weightSum !== 1 && '(⚠️ Should sum to 1.0)'}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={updateGlobalWeights.isPending || !hasChanges}
            >
              {updateGlobalWeights.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
            {weights.vibe !== 'default' && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => deleteVibe.mutate(weights.vibe)}
                disabled={deleteVibe.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WeightSlider
            label="Distance Weight"
            value={editedWeights.w_distance}
            onChange={(value) => handleWeightChange('w_distance', value)}
          />
          <WeightSlider
            label="Rating Weight"
            value={editedWeights.w_rating}
            onChange={(value) => handleWeightChange('w_rating', value)}
          />
          <WeightSlider
            label="Popularity Weight"
            value={editedWeights.w_popularity}
            onChange={(value) => handleWeightChange('w_popularity', value)}
          />
          <WeightSlider
            label="Tag Match Weight"
            value={editedWeights.w_tag_match}
            onChange={(value) => handleWeightChange('w_tag_match', value)}
          />
          <WeightSlider
            label="Cuisine Match Weight"
            value={editedWeights.w_cuisine_match}
            onChange={(value) => handleWeightChange('w_cuisine_match', value)}
          />
          <WeightSlider
            label="Price Fit Weight"
            value={editedWeights.w_price_fit}
            onChange={(value) => handleWeightChange('w_price_fit', value)}
          />
        </CardContent>
      </Card>
    );
  };

  if (globalLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vibe Weight Manager</h1>
        <p className="text-gray-600 mt-2">
          Configure how different factors influence venue recommendations for each vibe.
        </p>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">Global Weights</TabsTrigger>
          <TabsTrigger value="user">User Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Alert>
            <AlertDescription>
              Global weights apply to all users for each vibe. Users can have individual overrides.
              Weights should generally sum to 1.0 for balanced scoring.
            </AlertDescription>
          </Alert>

          {/* Add new vibe */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Vibe</CardTitle>
              <CardDescription>Create a new vibe with default weights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter vibe name (e.g., 'study', 'party')"
                  value={newVibe}
                  onChange={(e) => setNewVibe(e.target.value)}
                />
                <Button 
                  onClick={() => addNewVibe.mutate(newVibe)}
                  disabled={!newVibe.trim() || addNewVibe.isPending}
                >
                  {addNewVibe.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1" />
                  )}
                  Add Vibe
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Global weights */}
          <div className="grid gap-6 md:grid-cols-2">
            {globalWeights?.map((weights) => (
              <GlobalVibeEditor key={weights.vibe} weights={weights} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="user" className="space-y-6">
          <Alert>
            <AlertDescription>
              User-specific vibe weight overrides. These take precedence over global weights.
              Currently showing read-only data - user management would require additional permissions.
            </AlertDescription>
          </Alert>

          {userLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {userWeights?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No user overrides found</p>
              ) : (
                userWeights?.map((userWeight) => (
                  <Card key={`${userWeight.profile_id}-${userWeight.vibe}`}>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        User: {userWeight.profile_id} | Vibe: {userWeight.vibe}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {Object.entries(userWeight.weights).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace('w_', '').replace('_', ' ')}:</span>
                            <span className="font-mono">{value?.toFixed(3) || 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}