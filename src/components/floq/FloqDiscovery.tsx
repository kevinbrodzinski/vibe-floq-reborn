import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, MapPin, Calendar, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getVibeIcon } from '@/utils/vibeIcons';
import type { Vibe } from '@/lib/vibes';

interface DiscoverableFloq {
  id: string;
  title: string;
  description?: string;
  primary_vibe: Vibe;
  member_count: number;
  location?: string;
  created_at: string;
  is_public: boolean;
  is_member?: boolean;
}

interface FloqDiscoveryProps {
  onJoinFloq?: (floqId: string) => void;
}

export const FloqDiscovery: React.FC<FloqDiscoveryProps> = ({ onJoinFloq }) => {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [vibeFilter, setVibeFilter] = useState<Vibe | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState('');

  // Fetch discoverable floqs
  const { data: floqs = [], isLoading } = useQuery({
    queryKey: ['floq-discovery', searchQuery, vibeFilter, locationFilter],
    queryFn: async (): Promise<DiscoverableFloq[]> => {
      // Placeholder implementation - return mock data for now
      return [
        {
          id: 'mock-1',
          title: 'Chill Vibes Coffee',
          description: 'Relaxed coffee meetup',
          primary_vibe: 'chill' as Vibe,
          member_count: 8,
          location: 'Downtown',
          created_at: new Date().toISOString(),
          is_public: true,
          is_member: false
        }
      ] as DiscoverableFloq[];
    },
    enabled: !!currentUserId,
  });

  // Join floq mutation
  const joinFloqMutation = useMutation({
    mutationFn: async (floqId: string) => {
      const { error } = await supabase
        .from('floq_participants')
        .insert({
          floq_id: floqId,
          profile_id: currentUserId,
          role: 'member'
        });

      if (error) throw error;
    },
    onSuccess: (_, floqId) => {
      queryClient.invalidateQueries({ queryKey: ['floq-discovery'] });
      toast.success('Successfully joined floq!');
      onJoinFloq?.(floqId);
    },
    onError: () => {
      toast.error('Failed to join floq');
    }
  });

  const vibeOptions: Array<{ value: Vibe | 'all'; label: string }> = [
    { value: 'all', label: 'All Vibes' },
    { value: 'social', label: 'Social' },
    { value: 'chill', label: 'Chill' },
    { value: 'hype', label: 'Hype' },
    { value: 'curious', label: 'Curious' },
    { value: 'romantic', label: 'Romantic' },
    { value: 'weird', label: 'Weird' },
    { value: 'flowing', label: 'Flowing' },
    { value: 'open', label: 'Open' },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Discover Floqs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Search floqs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <Select value={vibeFilter} onValueChange={(value) => setVibeFilter(value as Vibe | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by vibe" />
                </SelectTrigger>
                <SelectContent>
                  {vibeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value !== 'all' && getVibeIcon(option.value)} {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Input
                placeholder="Location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floq Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            Loading floqs...
          </div>
        ) : floqs.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No floqs found matching your criteria
          </div>
        ) : (
          floqs.map((floq) => (
            <Card key={floq.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getVibeIcon(floq.primary_vibe)}</span>
                    <div>
                      <CardTitle className="text-lg">{floq.title}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {floq.primary_vibe}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {floq.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {floq.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {floq.member_count} member{floq.member_count !== 1 ? 's' : ''}
                  </div>
                  
                  {floq.location && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {floq.location}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Created {new Date(floq.created_at).toLocaleDateString()}
                </div>
                
                <div className="pt-2">
                  {floq.is_member ? (
                    <Badge variant="outline" className="w-full justify-center">
                      Already a member
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => joinFloqMutation.mutate(floq.id)}
                      disabled={joinFloqMutation.isPending}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Join Floq
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};