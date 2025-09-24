import { useState } from 'react';
import { MapPin, AlertCircle, Compass } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface GeolocationPromptProps {
  onRequestLocation: () => void;
  error?: string | null;
  loading?: boolean;
  onSetDebugLocation?: () => void;
}

export function GeolocationPrompt({ onRequestLocation, error, loading, onSetDebugLocation }: GeolocationPromptProps) {
  const [hasRequested, setHasRequested] = useState(false);

  const handleRequest = () => {
    setHasRequested(true);
    onRequestLocation();
  };

  const setDebugLocation = () => {
    if (onSetDebugLocation) {
      onSetDebugLocation();
    } else {
      // Fallback: set debug location in localStorage and reload
      localStorage.setItem('floq-debug-forceLoc', '34.078,-118.261'); // Venice, CA
      // Clear any cached coords to force refresh
      sessionStorage.removeItem('floq-coords');
      window.location.reload();
    }
  };

  const handleSkipLocation = () => {
    // Set default location and continue
    localStorage.setItem('floq-debug-forceLoc', '34.078,-118.261'); // Venice, CA  
    // Clear any cached coords to force refresh
    sessionStorage.removeItem('floq-coords');
    window.location.reload();
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Location Access Required</CardTitle>
        <CardDescription>
          We need your location to show nearby friends and activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === 'unavailable' && (
          <Alert variant="destructive" className="border-yellow-500/20 bg-yellow-500/10">
            <Compass className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-600">Searching for GPS…</AlertTitle>
            <AlertDescription className="text-yellow-600">
              We haven't picked up a signal yet. Try moving closer to a window or
              enable Wi-Fi for faster location.
            </AlertDescription>
          </Alert>
        )}

        {error && error !== 'unavailable' && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleRequest}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Getting Location...' : hasRequested ? 'Allow Location Access' : 'Enable Location'}
          </Button>

          {/* Demo location option - always visible in dev, hidden in production */}
          {import.meta.env.DEV && (
            <Button
              variant="outline"
              onClick={setDebugLocation}
              className="w-full"
            >
              Continue with Demo Location
            </Button>
          )}
          
          {import.meta.env.DEV && (
            <div className="text-xs text-muted-foreground text-center">
              Development mode: Demo location will be used
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="mb-1">Tips for enabling location:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Make sure you're on HTTPS or localhost</li>
            <li>Check browser settings allow location access</li>
            <li>On iOS: Settings → Safari → Location → Allow</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}