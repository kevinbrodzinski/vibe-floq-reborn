import React, { useState } from 'react';
import { InterestPills } from './InterestPills';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export function InterestPillsDemo() {
  const [interests, setInterests] = useState<string[]>(['music', 'art']);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Interest Pills Demo</CardTitle>
      </CardHeader>
      <CardContent>
        <InterestPills
          interests={interests}
          onInterestsChange={setInterests}
          maxInterests={8}
          placeholder="Try typing 'coffee' or 'hiking'..."
        />
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Current Interests:</p>
          <p className="text-xs text-muted-foreground">
            {interests.length > 0 ? interests.join(', ') : 'None added yet'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 