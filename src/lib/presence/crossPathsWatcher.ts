import { useEffect, useRef } from "react";

// Simple haversine distance calculation
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  
  const aVal = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal));
  
  return R * c;
}

type Friend = { 
  id: string; 
  lat: number; 
  lng: number; 
  tier: "bestie" | "friend" | "other"; 
};

type Options = {
  bestieRadiusM?: number;
  friendRadiusM?: number;
  cooldownMin?: number;
};

const DEFAULTS: Required<Options> = { 
  bestieRadiusM: 200, 
  friendRadiusM: 400, 
  cooldownMin: 45 
};

export function useCrossPathsWatcher(
  my: { lat?: number; lng?: number } | null,
  friends: Friend[] | null,
  opts?: Options
) {
  const lastSeenRef = useRef<Record<string, number>>({});
  const { bestieRadiusM, friendRadiusM, cooldownMin } = { ...DEFAULTS, ...(opts||{}) };

  useEffect(() => {
    if (!my?.lat || !my?.lng || !Array.isArray(friends)) return;

    const now = Date.now();
    const seen = lastSeenRef.current;

    for (const f of friends) {
      if (!Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
      
      const d = haversineMeters(
        { lat: my.lat!, lng: my.lng! }, 
        { lat: f.lat, lng: f.lng }
      );
      
      const limit = f.tier === "bestie" ? bestieRadiusM : 
                    f.tier === "friend" ? friendRadiusM : 0;
      
      if (limit <= 0) continue;

      const cool = (seen[f.id] ?? 0) + cooldownMin * 60_000 > now;
      if (d <= limit && !cool) {
        seen[f.id] = now;
        
        // Emit quiet banner notification
        window.dispatchEvent(new CustomEvent("floq:nearby_banner", {
          detail: { 
            id: f.id, 
            distanceM: d, 
            tier: f.tier 
          }
        }));
      }
    }
  }, [my?.lat, my?.lng, friends?.length, bestieRadiusM, friendRadiusM, cooldownMin]);
}