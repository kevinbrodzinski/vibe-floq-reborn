import { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface GeolocationPromptProps {
  onRequestLocation: () => void;
  error?: string | null;
  loading?: boolean;
}

export function GeolocationPrompt({ onRequestLocation, error, loading }: GeolocationPromptProps) {
  const [hasRequested, setHasRequested] = useState(false);

  const handleRequest = () => {
    setHasRequested(true);
    onRequestLocation();
  };

  const setDebugLocation = () => {
    localStorage.setItem('floq-debug-forceLoc', '34.078,-118.261'); // Silver Lake, LA
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
        {error && (
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
          
          {import.meta.env.DEV && (
            <Button 
              variant="outline" 
              onClick={setDebugLocation}
              className="w-full text-xs"
            >
              Use Debug Location (Dev)
            </Button>
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