/**
 * Error boundary component for location-related operations
 */
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { handleLocationError, normalizeLocationError } from '@/lib/location/errorBoundary';

interface LocationErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

interface LocationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class LocationErrorBoundary extends React.Component<
  LocationErrorBoundaryProps,
  LocationErrorBoundaryState
> {
  constructor(props: LocationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): LocationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LocationErrorBoundary] Caught error:', error, errorInfo);
    
    // Use standardized error handling
    const locationError = normalizeLocationError(error);
    handleLocationError(locationError, false); // Don't show toast in boundary
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const CustomFallback = this.props.fallback;
      
      if (CustomFallback) {
        return <CustomFallback error={this.state.error} retry={this.retry} />;
      }

      const locationError = normalizeLocationError(this.state.error);

      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Location Error</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">{locationError.userMessage}</p>
              {locationError.recoverable && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={this.retry}
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple error fallback component for location features
 */
export function LocationErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void;
}) {
  const locationError = normalizeLocationError(error);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Location Unavailable</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        {locationError.userMessage}
      </p>
      {locationError.recoverable && (
        <Button onClick={retry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}