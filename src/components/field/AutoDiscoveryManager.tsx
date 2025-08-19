import { useAutoDiscoveryNotifications } from '@/hooks/useAutoDiscoveryNotifications';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';

export const AutoDiscoveryManager = () => {
  const { location, isLocationReady } = useFieldLocation();
  
  const userLat = isLocationReady && location?.coords ? location.coords.lat : null;
  const userLng = isLocationReady && location?.coords ? location.coords.lng : null;

  // Enable auto-discovery with 30-second checks within 2km radius
  const { discoveries } = useAutoDiscoveryNotifications(userLat, userLng, {
    enabled: true,
    checkIntervalMs: 30000, // 30 seconds
    proximityRadiusM: 2000, // 2km
    waveMinSize: 3
  });

  // This component doesn't render anything - it just manages background notifications
  return null;
};