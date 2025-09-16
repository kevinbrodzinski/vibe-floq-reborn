import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertCircle } from 'lucide-react';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';

interface LocationPermissionPromptProps {
  onLocationGranted?: () => void;
  onSkip?: () => void;
}

export function LocationPermissionPrompt({ onLocationGranted, onSkip }: LocationPermissionPromptProps) {
  const { startTracking, hasPermission, status } = useUnifiedLocation({
    hookId: 'location-permission-prompt',
    enableTracking: false,
    enablePresence: false
  });

  const handleRequestLocation = () => {
    startTracking();
    if (hasPermission) {
      onLocationGranted?.();
    }
  };

  if (hasPermission) {
    onLocationGranted?.();
    return null;
  }

  return (
    <Card className="mx-4 my-6 bg-background/60 backdrop-blur-sm border border-border/30 shadow-lg">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">Enable Location</CardTitle>
          <CardDescription>
            Discover nearby floqs and connect with people around you
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-muted">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>Without location access:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• You can only see your own floqs (Tribes tab)</li>
              <li>• No nearby floq discovery</li>
              <li>• Limited social features</li>
            </ul>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={handleRequestLocation} 
            className="flex-1"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Requesting...' : 'Enable Location'}
          </Button>
          {onSkip && (
            <Button variant="outline" onClick={onSkip} className="flex-1">
              Continue Without
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}