import type { PlanStopUi } from '@/types/plan';
import { isGeometryPoint } from '@/lib/types/geometry';

/** Simple Lat/Lng shape used in transit hooks */
export interface Location {
  lat: number;
  lng: number;
  address: string;
}

// Extend PlanStopUi to include potential venue lat/lng and location
interface ExtendedPlanStopUi extends PlanStopUi {
  venue?: PlanStopUi['venue'] & { 
    lat?: number; 
    lng?: number; 
    address?: string;
  };
}

export const getLocationFromStop = (stop: ExtendedPlanStopUi): Location | null => {
  /* 1️⃣ explicit lat/lng on the venue record */
  if (stop.venue?.lat && stop.venue?.lng) {
    return {
      lat: stop.venue.lat,
      lng: stop.venue.lng,
      address: stop.venue.address ?? stop.address ?? '',
    };
  }

  /* 2️⃣ PostGIS geometry(Point,4326) field */
  const geo = stop.location as unknown;
  if (isGeometryPoint(geo)) {
    const [lng, lat] = geo.coordinates; // GeoJSON stores lon,lat
    return {
      lat,
      lng,
      address: stop.address ?? stop.venue?.address ?? '',
    };
  }

  /* 3️⃣ Nothing usable → null */
  return null;
};