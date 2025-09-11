// Test page for the vibe engine foundation
import React from 'react';
import { useVibeNow } from '@/hooks/useVibeNow';
import { useVibeDetection } from '@/store/useVibeDetection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedFlowHUD } from '@/components/flow/EnhancedFlowHUD';

export default function VibeEngineTestPage() {
  const { currentVibe, engineState, isInitialized, isEnabled, signalHealth, updateVenue } = useVibeNow();
  const { autoMode, toggleAutoMode } = useVibeDetection();

  const handleTestVenue = () => {
    const venues = [
      { name: 'Local Coffee Shop', category: 'cafe' },
      { name: 'Downtown Bar', category: 'bar' },
      { name: 'Italian Restaurant', category: 'restaurant' },
      { name: 'Art Gallery', category: 'attraction' },
    ];
    
    const venue = venues[Math.floor(Math.random() * venues.length)];
    updateVenue(venue.name, venue.category, { lat: 37.7749, lng: -122.4194 });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Enhanced Flow HUD Demo */}
      <EnhancedFlowHUD elapsedMin={15} sui01={0.75} />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🧠 Vibe Engine Test</h1>
          <p className="text-muted-foreground">
            Week 1 Implementation: Primary + Behavioral Signals
          </p>
        </div>

        {/* Engine Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Engine Status
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? 'Active' : 'Disabled'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time vibe detection with confidence scoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={toggleAutoMode}
                variant={autoMode ? 'destructive' : 'default'}
              >
                {autoMode ? 'Disable' : 'Enable'} Auto Detection
              </Button>
              
              <Button 
                onClick={handleTestVenue}
                variant="outline"
                disabled={!isEnabled}
              >
                Test Venue Update
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {currentVibe ? `${Math.round(currentVibe.energy * 100)}%` : '--'}
                </div>
                <div className="text-sm text-muted-foreground">Energy Level</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-foreground">
                  {currentVibe ? `${Math.round(currentVibe.confidence * 100)}%` : '--'}
                </div>
                <div className="text-sm text-muted-foreground">Confidence</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-foreground">
                  {currentVibe?.sources.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active Signals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Vibe Details */}
        {currentVibe && (
          <Card>
            <CardHeader>
              <CardTitle>Current Vibe Reading</CardTitle>
              <CardDescription>
                {new Date(currentVibe.t).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <strong>Energy:</strong> {Math.round(currentVibe.energy * 100)}%
                  <div className="w-full bg-secondary rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${currentVibe.energy * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <strong>Confidence:</strong> {Math.round(currentVibe.confidence * 100)}%
                  <div className="w-full bg-secondary rounded-full h-2 mt-1">
                    <div 
                      className="bg-secondary-foreground h-2 rounded-full transition-all duration-500"
                      style={{ width: `${currentVibe.confidence * 100}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <strong>Active Sources:</strong>{' '}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentVibe.sources.map(source => (
                      <Badge key={source} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>

                {currentVibe.breakdown && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Primary: {Math.round(currentVibe.breakdown.primary * 100)}%</div>
                    <div>Behavioral: {Math.round(currentVibe.breakdown.behavioral * 100)}%</div>
                    <div>Environmental: {Math.round(currentVibe.breakdown.environmental * 100)}%</div>
                    <div>Social: {Math.round(currentVibe.breakdown.social * 100)}%</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signal Health */}
        <Card>
          <CardHeader>
            <CardTitle>Signal Health</CardTitle>
            <CardDescription>
              Quality scores for each signal type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(signalHealth).map(([signal, health]) => (
                <div key={signal} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{signal}</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(health * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        health >= 0.7 ? 'bg-green-500' :
                        health >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${health * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Engine State Debug */}
        {engineState && process.env.NODE_ENV === 'development' && (
          <Card>
            <CardHeader>
              <CardTitle>Debug: Engine State</CardTitle>
              <CardDescription>Development view of internal state</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(engineState, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Implementation Status */}
        <Card>
          <CardHeader>
            <CardTitle>Week 1 Implementation Status</CardTitle>
            <CardDescription>Foundation features completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Core vibe engine architecture</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Signal orchestrator with 60s buffer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Primary signals (location, movement, temporal, device)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Behavioral sequence detection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Enhanced Flow HUD integration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Confidence scoring & quality metrics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">Week 2: Environmental signals (permission-gated)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">Week 3: Social signals (convergence-driven)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}