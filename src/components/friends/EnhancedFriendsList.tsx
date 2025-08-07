import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  MapPin, 
  Search, 
  Filter, 
  Settings, 
  Navigation, 
  Clock,
  Signal,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useEnhancedFriendDistances } from '@/hooks/useEnhancedFriendDistances';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { FriendDistanceCard } from './FriendDistanceCard';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EnhancedFriendsListProps {
  className?: string;
  showSettings?: boolean;
  onFriendNavigate?: (friendId: string, location: { lat: number; lng: number }) => void;
  onFriendMessage?: (friendId: string) => void;
}

export function EnhancedFriendsList({ 
  className, 
  showSettings = true,
  onFriendNavigate,
  onFriendMessage 
}: EnhancedFriendsListProps) {
  const { toast } = useToast();
  
  // Get unified friends data for integration
  const { rows: unifiedFriends, isLoading: friendsLoading } = useUnifiedFriends();
  
  // Settings state
  const [maxDistance, setMaxDistance] = useState(5000); // 5km default
  const [sortBy, setSortBy] = useState<'distance' | 'lastSeen' | 'confidence'>('distance');
  const [enableProximityTracking, setEnableProximityTracking] = useState(true);
  const [enablePrivacyFiltering, setEnablePrivacyFiltering] = useState(true);
  const [includeOffline, setIncludeOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Use enhanced friend distances hook
  const {
    friends,
    nearbyCount,
    totalFriends,
    lastUpdate,
    isLoading,
    error,
    hasNearbyFriends,
    averageDistance,
    highConfidenceFriends,
    getFriendsWithinDistance,
    refreshFriendLocations,
    formatDistance
  } = useEnhancedFriendDistances({
    maxDistance,
    enableProximityTracking,
    enablePrivacyFiltering,
    sortBy,
    includeOffline,
    updateInterval: 30000
  });

  // Enhanced filtering with unified friends integration
  const filteredFriends = friends.filter(friendDistance => {
    const friend = friendDistance.friend;
    
    // Find corresponding unified friend data
    const unifiedFriend = unifiedFriends.find(uf => uf.id === friend.profileId);
    
    // Only show accepted friends (filter out pending/blocked)
    if (!unifiedFriend || unifiedFriend.friend_state !== 'accepted') {
      return false;
    }
    
    const matchesSearch = !searchQuery || 
      friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unifiedFriend.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'nearby':
        return friendDistance.isNearby;
      case 'high-confidence':
        return friendDistance.confidence > 0.8;
      case 'recent':
        return Date.now() - friendDistance.lastSeen < 30 * 60 * 1000; // 30 minutes
      case 'online':
        return unifiedFriend.online;
      default:
        return true;
    }
  });

  // Handle friend actions
  const handleNavigate = useCallback((friendDistance: any) => {
    if (onFriendNavigate) {
      onFriendNavigate(
        friendDistance.friend.profileId, 
        friendDistance.friend.location
      );
    } else {
      toast({
        title: 'Navigate to Friend',
        description: `${friendDistance.friend.displayName} is ${friendDistance.formattedDistance} away`,
      });
    }
  }, [onFriendNavigate, toast]);

  const handleMessage = useCallback((friendDistance: any) => {
    if (onFriendMessage) {
      onFriendMessage(friendDistance.friend.profileId);
    } else {
      toast({
        title: 'Message Friend',
        description: `Opening chat with ${friendDistance.friend.displayName}`,
      });
    }
  }, [onFriendMessage, toast]);

  const handleRefresh = useCallback(() => {
    refreshFriendLocations();
    toast({
      title: 'Refreshing',
      description: 'Updated friend locations',
    });
  }, [refreshFriendLocations, toast]);

  // Get distance range options
  const distanceOptions = [
    { value: 500, label: '500m' },
    { value: 1000, label: '1km' },
    { value: 2000, label: '2km' },
    { value: 5000, label: '5km' },
    { value: 10000, label: '10km' },
    { value: 25000, label: '25km' }
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle className="text-lg">Friends Nearby</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{nearbyCount}</div>
              <div className="text-xs text-muted-foreground">Nearby</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalFriends}</div>
              <div className="text-xs text-muted-foreground">Total Sharing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{highConfidenceFriends.length}</div>
              <div className="text-xs text-muted-foreground">High Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {averageDistance > 0 ? formatDistance(averageDistance) : '—'}
              </div>
              <div className="text-xs text-muted-foreground">Avg Distance</div>
            </div>
          </div>

          {/* Quick actions */}
          {hasNearbyFriends && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                {nearbyCount} friend{nearbyCount === 1 ? '' : 's'} nearby
              </span>
              <Button variant="outline" size="sm" className="ml-auto">
                <Navigation className="h-3 w-3 mr-1" />
                Navigate
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings panel */}
      {showSettings && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <CardTitle className="text-base">Distance Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Max distance */}
              <div className="space-y-2">
                <Label className="text-xs">Max Distance</Label>
                <Select
                  value={maxDistance.toString()}
                  onValueChange={(value) => setMaxDistance(parseInt(value))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {distanceOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort by */}
              <div className="space-y-2">
                <Label className="text-xs">Sort By</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="lastSeen">Last Seen</SelectItem>
                    <SelectItem value="confidence">Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Proximity Tracking</Label>
                  <Switch
                    checked={enableProximityTracking}
                    onCheckedChange={setEnableProximityTracking}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Privacy Filtering</Label>
                  <Switch
                    checked={enablePrivacyFiltering}
                    onCheckedChange={setEnablePrivacyFiltering}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Include Offline</Label>
                  <Switch
                    checked={includeOffline}
                    onCheckedChange={setIncludeOffline}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="nearby" className="text-xs">
                  Nearby
                  {nearbyCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      {nearbyCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="online" className="text-xs">
                  Online
                  {unifiedFriends.filter(f => f.online && f.friend_state === 'accepted').length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      {unifiedFriends.filter(f => f.online && f.friend_state === 'accepted').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="high-confidence" className="text-xs">Accurate</TabsTrigger>
                <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Friends list */}
      <div className="space-y-3">
        {(isLoading || friendsLoading) && filteredFriends.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading friend locations...</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredFriends.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No Friends Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {totalFriends === 0 
                  ? "No friends are sharing their location with you."
                  : "No friends match your current filters."}
              </p>
              {totalFriends === 0 && (
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Friends
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {filteredFriends.map((friendDistance) => {
          // Get unified friend data for enhanced display
          const unifiedFriend = unifiedFriends.find(uf => uf.id === friendDistance.friend.profileId);
          
          return (
            <FriendDistanceCard
              key={friendDistance.friend.profileId}
              friendDistance={{
                ...friendDistance,
                // Enhance with unified friend data
                friend: {
                  ...friendDistance.friend,
                  displayName: unifiedFriend?.display_name || friendDistance.friend.displayName,
                  avatarUrl: unifiedFriend?.avatar_url || friendDistance.friend.avatarUrl,
                }
              }}
              onNavigate={handleNavigate}
              onMessage={handleMessage}
              showConfidence={true}
              showPrivacyStatus={true}
              // Additional props from unified friends
              isOnline={unifiedFriend?.online}
              vibeTag={unifiedFriend?.vibe_tag}
              username={unifiedFriend?.username}
            />
          );
        })}
      </div>

      {/* Footer info */}
      {filteredFriends.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Updated {new Date(lastUpdate).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Signal className="h-3 w-3" />
                  <span>{highConfidenceFriends.length} high accuracy</span>
                </div>
                {enablePrivacyFiltering && (
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>Privacy enabled</span>
                  </div>
                )}
              </div>
              <div>
                Showing {filteredFriends.length} of {totalFriends} friends
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}