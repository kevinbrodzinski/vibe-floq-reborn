// FE↔Edge contracts for venue tiles, details, and social weather

export type ViewportInput = {
  bbox?: [number, number, number, number];  // [minLng,minLat,maxLng,maxLat]
  center?: [number, number];                // [lng,lat]
  radius?: number;                          // meters
  zoom: number;                             // 3..20
};

export type TileVenue = {
  pid: string;       // provider id (google place_id)
  name: string;
  lng: number;
  lat: number;
  category?: string;
  open_now?: boolean;
  busy_band?: 0|1|2|3|4; // coarse only
  score?: number;
  src: Array<"google"|"fsq"|"besttime"|"floq">;
};

export type TileVenuesResponse = {
  venues: TileVenue[];
  ttlSec: number;
  attribution: string[];
};

export type VenueDetail = {
  pid: string;
  name: string;
  address?: string;
  phone?: string;
  photos?: string[];
  rating?: number;
  price?: 1|2|3|4;
  hours?: unknown;
  busy_band?: 0|1|2|3|4;
  attributes?: Record<string, unknown>;
  src: Array<"google"|"fsq"|"besttime"|"floq">;
  attribution: string[];
};

export type VenueDetailResponse = {
  venue: VenueDetail;
  ttlSec: number;
};

export type PressureCell = {
  key: string;
  center: [number, number];     // [lng,lat]
  pressure: number;             // 0..1
  temperature: number;          // 0..1
  humidity: number;             // 0..1
  wind: [number, number];       // dx,dy
};

export type SocialWeatherResponse = {
  cells: PressureCell[];
  ttlSec: number;
};