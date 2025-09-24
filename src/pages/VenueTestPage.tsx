import React, { useState } from 'react';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useVenueInteractionTest } from '@/hooks/useVenueInteractionTest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * Test page for venue functionality - only shows in development
 */
export default function VenueTestPage() {
  const [venueId, setVenueId] = useState('11111111-1111-1111-1111-111111111111');
  
  const { data: venue, isLoading: venueLoading, error: venueError } = useVenueDetails(venueId);
  const { favorite, checkIn, view, share, isLoading: interactionLoading } = useVenueInteractions();
  const { data: testData, isLoading: testLoading } = useVenueInteractionTest(venueId);

  const handleTest = async (action: string) => {
    if (!venueId) return;
    
    try {
      switch (action) {
        case 'favorite':
          await favorite(venueId);
          toast.success('Favorited!');
          break;
        case 'checkin':
          await checkIn(venueId);
          toast.success('Checked in!');
          break;
        case 'view':
          await view(venueId);
          toast.success('View recorded!');
          break;
        case 'share':
          await share(venueId);
          toast.success('Share recorded!');
          break;
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error(`${action} failed: ${error.message}`);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Venue Functionality Test</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Venue ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                placeholder="Enter venue ID"
                className="flex-1"
              />
              <Button 
                onClick={() => setVenueId('11111111-1111-1111-1111-111111111111')}
                variant="outline"
              >
                Reset to Griffin
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Venue Details */}
        <Card>
          <CardHeader>
            <CardTitle>Venue Details</CardTitle>
          </CardHeader>
          <CardContent>
            {venueLoading && <p>Loading venue...</p>}
            {venueError && <p className="text-red-500">Error: {venueError.message}</p>}
            {venue && (
              <div className="space-y-2">
                <p><strong>Name:</strong> {venue.name}</p>
                <p><strong>Vibe:</strong> {venue.vibe || 'None'}</p>
                <p><strong>Description:</strong> {venue.description || 'None'}</p>
                <p><strong>Live Count:</strong> {venue.live_count}</p>
                <p><strong>Vibe Score:</strong> {venue.vibe_score}</p>
                <p><strong>Popularity:</strong> {venue.popularity}</p>
                <p><strong>Location:</strong> {venue.lat}, {venue.lng}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interaction Test */}
        <Card>
          <CardHeader>
            <CardTitle>Test Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                onClick={() => handleTest('favorite')}
                disabled={interactionLoading}
                variant="outline"
              >
                Favorite
              </Button>
              <Button 
                onClick={() => handleTest('checkin')}
                disabled={interactionLoading}
                variant="outline"
              >
                Check In
              </Button>
              <Button 
                onClick={() => handleTest('view')}
                disabled={interactionLoading}
                variant="outline"
              >
                View
              </Button>
              <Button 
                onClick={() => handleTest('share')}
                disabled={interactionLoading}
                variant="outline"
              >
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Data */}
        <Card>
          <CardHeader>
            <CardTitle>Interaction Test Data</CardTitle>
          </CardHeader>
          <CardContent>
            {testLoading && <p>Loading test data...</p>}
            {testData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="font-semibold">Views</p>
                  <p className="text-2xl">{testData.viewCount}</p>
                </div>
                <div>
                  <p className="font-semibold">Favorites</p>
                  <p className="text-2xl">{testData.favoriteCount}</p>
                </div>
                <div>
                  <p className="font-semibold">Check-ins</p>
                  <p className="text-2xl">{testData.checkInCount}</p>
                </div>
                <div>
                  <p className="font-semibold">Shares</p>
                  <p className="text-2xl">{testData.shareCount}</p>
                </div>
              </div>
            )}
            
            {testData && (
              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Currently Present:</strong> {testData.isCurrentlyPresent ? 'Yes' : 'No'}</p>
                <p><strong>Total Interactions:</strong> {testData.interactions.length}</p>
                <p><strong>Has Any Interactions:</strong> {testData.hasInteractions ? 'Yes' : 'No'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}