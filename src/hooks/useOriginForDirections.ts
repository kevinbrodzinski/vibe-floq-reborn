import { useMemo } from "react";
import { useUnifiedLocation } from "@/hooks/location/useUnifiedLocation";

/**
 * Returns {lat,lng} for in-app directions, sourced from the unified location stack.
 * It auto-starts tracking only while directions UI is open.
 */
export function useOriginForDirections(enabled: boolean, hookId = "directions") {
  const { coords } = useUnifiedLocation({ hookId, autoStart: enabled });
  return useMemo(
    () => (enabled && coords ? { lat: coords.lat, lng: coords.lng } : null),
    [enabled, coords?.lat, coords?.lng]
  );
}