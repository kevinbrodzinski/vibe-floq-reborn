import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

interface LocationFallbackProps {
  error?: GeolocationPositionError | null;
  onRetry?: () => void;
  onManualLocation?: () => void;
}

export const LocationFallback: React.FC<LocationFallbackProps> = ({
  error,
  onRetry,
  onManualLocation
}) => {
  const getErrorMessage = (error?: GeolocationPositionError | null) => {
    if (!error) return 'Location unavailable';
    
    switch (error.code) {
      case 1:
        return 'Location access denied. Please enable location permissions.';
      case 2:
        return 'Location unavailable. Your device cannot determine your current position.';
      case 3:
        return 'Location request timed out. Please try again.';
      default:
        return 'Unable to get your location.';
    }
  };

  const getActionButton = (error?: GeolocationPositionError | null) => {
    if (!error) return null;
    
    switch (error.code) {
      case 1:
        return (
          <Button 
            variant="outline" 
            onClick={() => window.open('chrome://settings/content/location', '_blank')}
            className="w-full"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Enable Location
          </Button>
        );
      case 2:
      case 3:
        return (
          <Button 
            variant="outline" 
            onClick={onRetry}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="mx-4 mb-4 border-amber-200 bg-amber-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-amber-900">Location Services</h4>
              <p className="text-sm text-amber-700 mt-1">
                {getErrorMessage(error)}
              </p>
            </div>
            
            <div className="space-y-2">
              {getActionButton(error)}
              
              {onManualLocation && (
                <Button 
                  variant="ghost" 
                  onClick={onManualLocation}
                  className="w-full text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Set Location Manually
                </Button>
              )}
            </div>
            
            <p className="text-xs text-amber-600">
              💡 Some features work better with location access, but you can still use most of the app without it.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};