import React, { useEffect, useState } from 'react';
import { MapPin, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { useRobustLocation } from '@/hooks/useRobustLocation';
import { useMyLocation } from '@/hooks/useMyLocation';

export const LocationPinDiagnostic = () => {
  const [permissionState, setPermissionState] = useState<string>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  // Test multiple location systems
  const fieldLocation = useFieldLocation();
  const unifiedLocation = useUnifiedLocation({
    enableTracking: true,
    enablePresence: true,
    hookId: 'diagnostic'
  });
  const robustLocation = useRobustLocation();
  const myLocation = useMyLocation();

  // Check geolocation permission
  useEffect(() => {
    const checkPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          setPermissionState(permission.state);
          
          permission.addEventListener('change', () => {
            setPermissionState(permission.state);
          });
        } catch (error) {
          console.error('Error checking geolocation permission:', error);
          setPermissionState('error');
        }
      } else {
        setPermissionState('not-supported');
      }
    };

    checkPermission();
  }, []);

  const requestLocationPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      console.log('Location permission granted:', position);
      setPermissionState('granted');
    } catch (error) {
      console.error('Location permission denied:', error);
      setPermissionState('denied');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const getStatusIcon = (status: string, hasCoords: boolean) => {
    if (hasCoords) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'loading') return <Clock className="w-4 h-4 text-yellow-500" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <RefreshCw className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status: string, hasCoords: boolean) => {
    if (hasCoords) return 'default';
    if (status === 'loading') return 'secondary';
    if (status === 'error') return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-6 h-6" />
        <h2 className="text-xl font-semibold">Location Pin Diagnostic</h2>
      </div>

      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Browser Permission Status
            <Badge variant={permissionState === 'granted' ? 'default' : 'destructive'}>
              {permissionState}
            </Badge>
          </CardTitle>
          <CardDescription>
            Your browser's geolocation permission status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissionState === 'prompt' && (
            <Button 
              onClick={requestLocationPermission}
              disabled={isRequestingPermission}
              className="w-full"
            >
              {isRequestingPermission ? 'Requesting...' : 'Grant Location Permission'}
            </Button>
          )}
          {permissionState === 'denied' && (
            <div className="text-sm text-red-600">
              Location access denied. Please enable it in your browser settings and refresh the page.
            </div>
          )}
          {permissionState === 'granted' && (
            <div className="text-sm text-green-600">
              ✅ Location permission granted
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Systems Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Field Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {getStatusIcon(fieldLocation.location.status, !!fieldLocation.location.coords)}
              Field Location
              <Badge variant={getStatusColor(fieldLocation.location.status, !!fieldLocation.location.coords)}>
                {fieldLocation.location.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong>Ready:</strong> {fieldLocation.isLocationReady ? '✅ Yes' : '❌ No'}
            </div>
            <div className="text-sm">
              <strong>Coords:</strong> {fieldLocation.location.coords 
                ? `${fieldLocation.location.coords.lat.toFixed(6)}, ${fieldLocation.location.coords.lng.toFixed(6)}`
                : 'None'
              }
            </div>
            <div className="text-sm">
              <strong>Tracking:</strong> {fieldLocation.location.isTracking ? '✅ Yes' : '❌ No'}
            </div>
            {fieldLocation.location.error && (
              <div className="text-sm text-red-600">
                <strong>Error:</strong> {fieldLocation.location.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unified Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {getStatusIcon(unifiedLocation.status, !!unifiedLocation.coords)}
              Unified Location
              <Badge variant={getStatusColor(unifiedLocation.status, !!unifiedLocation.coords)}>
                {unifiedLocation.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong>Permission:</strong> {unifiedLocation.hasPermission ? '✅ Yes' : '❌ No'}
            </div>
            <div className="text-sm">
              <strong>Coords:</strong> {unifiedLocation.coords 
                ? `${unifiedLocation.coords.lat.toFixed(6)}, ${unifiedLocation.coords.lng.toFixed(6)}`
                : 'None'
              }
            </div>
            <div className="text-sm">
              <strong>Tracking:</strong> {unifiedLocation.isTracking ? '✅ Yes' : '❌ No'}
            </div>
            {unifiedLocation.error && (
              <div className="text-sm text-red-600">
                <strong>Error:</strong> {unifiedLocation.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Robust Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {getStatusIcon(robustLocation.loading ? 'loading' : 'success', !!robustLocation.location)}
              Robust Location
              <Badge variant={robustLocation.location ? 'default' : robustLocation.loading ? 'secondary' : 'destructive'}>
                {robustLocation.loading ? 'loading' : robustLocation.location ? 'success' : 'error'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong>Permission:</strong> {robustLocation.hasPermission ? '✅ Yes' : '❌ No'}
            </div>
            <div className="text-sm">
              <strong>Coords:</strong> {robustLocation.location 
                ? `${robustLocation.location.lat.toFixed(6)}, ${robustLocation.location.lng.toFixed(6)}`
                : 'None'
              }
            </div>
            <div className="text-sm">
              <strong>Loading:</strong> {robustLocation.loading ? '⏳ Yes' : '✅ No'}
            </div>
            {robustLocation.error && (
              <div className="text-sm text-red-600">
                <strong>Error:</strong> {robustLocation.error.message}
              </div>
            )}
            <Button 
              onClick={robustLocation.requestLocation} 
              size="sm" 
              variant="outline"
              className="w-full"
            >
              Retry Location
            </Button>
          </CardContent>
        </Card>

        {/* My Location (Legacy) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {getStatusIcon('success', !!myLocation)}
              My Location (Legacy)
              <Badge variant={myLocation ? 'default' : 'outline'}>
                {myLocation ? 'success' : 'idle'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong>Coords:</strong> {myLocation 
                ? `${myLocation.lat.toFixed(6)}, ${myLocation.lng.toFixed(6)}`
                : 'None'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            onClick={() => unifiedLocation.startTracking()} 
            variant="outline"
            className="w-full"
            disabled={unifiedLocation.isTracking}
          >
            {unifiedLocation.isTracking ? 'Tracking Active' : 'Start Unified Tracking'}
          </Button>
          
          <Button 
            onClick={() => fieldLocation.location.startTracking()} 
            variant="outline"
            className="w-full"
            disabled={fieldLocation.location.isTracking}
          >
            {fieldLocation.location.isTracking ? 'Field Tracking Active' : 'Start Field Tracking'}
          </Button>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="secondary"
            className="w-full"
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify({
              permissionState,
              fieldLocation: {
                status: fieldLocation.location.status,
                coords: fieldLocation.location.coords,
                isReady: fieldLocation.isLocationReady,
                isTracking: fieldLocation.location.isTracking,
                error: fieldLocation.location.error
              },
              unifiedLocation: {
                status: unifiedLocation.status,
                coords: unifiedLocation.coords,
                hasPermission: unifiedLocation.hasPermission,
                isTracking: unifiedLocation.isTracking,
                error: unifiedLocation.error
              },
              robustLocation: {
                location: robustLocation.location,
                hasPermission: robustLocation.hasPermission,
                loading: robustLocation.loading,
                error: robustLocation.error?.message
              },
              myLocation,
              navigator: {
                geolocationAvailable: 'geolocation' in navigator,
                userAgent: navigator.userAgent.substring(0, 100)
              }
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};