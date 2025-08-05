import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';

interface VenueIntelligenceTabProps {
  afterglowId: string;
}

export default function VenueIntelligenceTab({ afterglowId }: VenueIntelligenceTabProps) {
  console.log('VenueIntelligenceTab rendered with afterglowId:', afterglowId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Venue Intelligence</h3>
        <p className="text-sm text-muted-foreground">
          AI-powered insights about your venue experiences and social connections
        </p>
      </div>

      {/* Simple Test Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Venue Intelligence Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">
              This is a simplified version of the Venue Intelligence tab to test basic functionality.
            </p>
            
            <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-2">
              <p><strong>Debug Info:</strong></p>
              <p>Afterglow ID: {afterglowId || 'Not provided'}</p>
              <p>Component Status: Loaded successfully</p>
            </div>

            <Button 
              onClick={() => {
                console.log('Test button clicked in VenueIntelligenceTab');
                console.log('Afterglow ID:', afterglowId);
                alert('Venue Intelligence tab is working!');
              }}
              className="w-full"
            >
              Test Venue Intelligence
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Venue Intelligence Features</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✨ Vibe Match Scoring</p>
              <p>👥 Social Proof Analysis</p>
              <p>📊 Crowd Intelligence</p>
              <p>🎯 Personalized Recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}