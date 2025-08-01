import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * SocialMode - Placeholder for social features
 * Will be populated in later phases with friend alignment, mini map, etc.
 */
export const SocialMode: React.FC = () => {
  return (
    <div className="flex-1 pt-4">
      <div className="px-4 space-y-4">
        {/* Friend Alignment Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Friend Vibe Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Coming soon: See friends with matching vibes
            </p>
            <Button variant="outline" disabled>
              Find Matches
            </Button>
          </CardContent>
        </Card>

        {/* Mini Density Map Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Vibe Clusters Nearby</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[16/9] bg-muted rounded-lg flex items-center justify-center mb-3">
              <p className="text-sm text-muted-foreground">
                Map preview coming soon
              </p>
            </div>
            <Button variant="outline" disabled>
              Explore Clusters
            </Button>
          </CardContent>
        </Card>

        {/* Suggested Actions Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Suggested Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Coming soon: Personalized suggestions based on your vibe
            </p>
            <Button variant="outline" disabled>
              Get Suggestions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};