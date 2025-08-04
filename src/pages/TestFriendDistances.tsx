import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Users, 
  Settings, 
  TestTube,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Clock,
  Signal
} from 'lucide-react';

// Import our new enhanced components
import { EnhancedFriendsList } from '@/components/friends/EnhancedFriendsList';
import { FriendDistanceCard } from '@/components/friends/FriendDistanceCard';
import { useEnhancedFriendDistances } from '@/hooks/useEnhancedFriendDistances';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAuth } from '@/providers/AuthProvider';

export default function TestFriendDistances() {
  const { user } = useAuth();
  const { pos, isTracking, startTracking, stopTracking } = useUserLocation();
  const [testDistance, setTestDistance] = useState(5000); // 5km

  // Test the enhanced system
  const enhancedSystem = useEnhancedFriendDistances({
    maxDistance: testDistance,
    enableProximityTracking: true,
    enablePrivacyFiltering: true,
    sortBy: 'distance'
  });

  // Test the legacy system (now enhanced)
  const legacySystem = useNearbyFriends(pos?.lat, pos?.lng, { 
    km: testDistance / 1000,
    enabled: true 
  });

  const handleStartLocationTracking = () => {
    startTracking();
  };

  const handleStopLocationTracking = () => {
    stopTracking();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <TestTube className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">Enhanced Friend Distance System Test</CardTitle>
              <p className="text-muted-foreground">
                Test the new enhanced friend distance detection with privacy controls and confidence scoring
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Authenticated</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Not logged in</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {pos ? (
                <>
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Location: {pos.accuracy}m accuracy</span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">No location</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isTracking ? (
                <>
                  <Signal className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Tracking active</span>
                </>
              ) : (
                <>
                  <Signal className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Tracking inactive</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{enhancedSystem.totalFriends} friends sharing</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {!isTracking ? (
              <Button onClick={handleStartLocationTracking} size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Start Location Tracking
              </Button>
            ) : (
              <Button onClick={handleStopLocationTracking} variant="outline" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Stop Tracking
              </Button>
            )}
            
            <Button onClick={enhancedSystem.refreshFriendLocations} variant="outline" size="sm">
              <Navigation className="h-4 w-4 mr-2" />
              Refresh Friends
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {!user && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be logged in to test friend distance detection. Please sign in first.
          </AlertDescription>
        </Alert>
      )}

      {!pos && user && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            Location access is required to test friend distances. Click "Start Location Tracking" above.
          </AlertDescription>
        </Alert>
      )}

      {/* Test tabs */}
      <Tabs defaultValue="enhanced" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enhanced">Enhanced System</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Compatibility</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        {/* Enhanced system test */}
        <TabsContent value="enhanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Enhanced Friend Distance System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{enhancedSystem.nearbyCount}</div>
                  <div className="text-xs text-muted-foreground">Nearby</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{enhancedSystem.totalFriends}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{enhancedSystem.highConfidenceFriends.length}</div>
                  <div className="text-xs text-muted-foreground">High Confidence</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {enhancedSystem.averageDistance > 0 
                      ? enhancedSystem.formatDistance(enhancedSystem.averageDistance) 
                      : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Distance</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {enhancedSystem.isLoading ? (
                      <Clock className="h-6 w-6 animate-spin mx-auto" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
              </div>

              {enhancedSystem.error && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{enhancedSystem.error}</AlertDescription>
                </Alert>
              )}

              {/* Sample friend cards */}
              {enhancedSystem.friends.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Sample Friend Distance Cards:</h4>
                  {enhancedSystem.friends.slice(0, 3).map(friendDistance => (
                    <FriendDistanceCard
                      key={friendDistance.friend.profileId}
                      friendDistance={friendDistance}
                      onNavigate={(friend) => console.log('Navigate to:', friend)}
                      onMessage={(friend) => console.log('Message:', friend)}
                      showConfidence={true}
                      showPrivacyStatus={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full enhanced friends list */}
          <EnhancedFriendsList
            showSettings={true}
            onFriendNavigate={(friendId, location) => {
              console.log(`Navigate to friend ${friendId} at:`, location);
              alert(`Navigate to friend at ${location.lat}, ${location.lng}`);
            }}
            onFriendMessage={(friendId) => {
              console.log(`Message friend ${friendId}`);
              alert(`Open chat with friend ${friendId}`);
            }}
          />
        </TabsContent>

        {/* Legacy system test */}
        <TabsContent value="legacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Legacy System (Now Enhanced)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{legacySystem.data.length}</div>
                  <div className="text-xs text-muted-foreground">Friends Found</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {legacySystem.isLoading ? (
                      <Clock className="h-6 w-6 animate-spin mx-auto" />
                    ) : legacySystem.isSuccess ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{testDistance / 1000}km</div>
                  <div className="text-xs text-muted-foreground">Search Radius</div>
                </div>
              </div>

              {legacySystem.error && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{legacySystem.error.message}</AlertDescription>
                </Alert>
              )}

              {/* Legacy format display */}
              {legacySystem.data.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Legacy Format Results:</h4>
                  {legacySystem.data.map(friend => (
                    <Card key={friend.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{friend.display_name || 'Unknown'}</span>
                          <div className="text-sm text-muted-foreground">
                            ID: {friend.id} | Distance: {friend.distance_m}m
                          </div>
                        </div>
                        <Badge variant="outline">
                          {Math.round(friend.distance_m)}m away
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {legacySystem.data.length === 0 && !legacySystem.isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No friends found within {testDistance / 1000}km
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 text-green-600">Enhanced System Features</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Confidence scoring ({enhancedSystem.highConfidenceFriends.length} high confidence)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Privacy filtering with geofencing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Proximity event tracking (enter/exit/sustain)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Real-time updates with channels
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Advanced UI with reliability indicators
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Configurable distance ranges and sorting
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-blue-600">Legacy System (Backward Compatible)</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Simple distance-only results
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Fixed format for compatibility
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Now powered by enhanced backend
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Existing components work unchanged
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h5 className="font-medium mb-2">Performance Comparison</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Enhanced System:</span>
                    <div>• {enhancedSystem.friends.length} friends with full analysis</div>
                    <div>• Average confidence: {
                      enhancedSystem.friends.length > 0 
                        ? Math.round(enhancedSystem.friends.reduce((sum, f) => sum + f.confidence, 0) / enhancedSystem.friends.length * 100)
                        : 0
                    }%</div>
                    <div>• Last update: {enhancedSystem.lastUpdate ? new Date(enhancedSystem.lastUpdate).toLocaleTimeString() : 'Never'}</div>
                  </div>
                  <div>
                    <span className="font-medium">Legacy System:</span>
                    <div>• {legacySystem.data.length} friends (basic format)</div>
                    <div>• Distance only, no confidence</div>
                    <div>• Status: {legacySystem.isSuccess ? 'Success' : legacySystem.isLoading ? 'Loading' : 'Error'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debug info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>Current Location: {pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)} (±${pos.accuracy}m)` : 'Not available'}</div>
          <div>User ID: {user?.id || 'Not logged in'}</div>
          <div>Enhanced System Status: {enhancedSystem.isLoading ? 'Loading' : enhancedSystem.error ? 'Error' : 'Ready'}</div>
          <div>Legacy System Status: {legacySystem.isLoading ? 'Loading' : legacySystem.error ? 'Error' : 'Ready'}</div>
          <div>Test Distance: {testDistance}m ({testDistance / 1000}km)</div>
        </CardContent>
      </Card>
    </div>
  );
}