// Map types - consolidated from removed packages directory

export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom: number;
}

export interface MapViewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bounds: Bounds;
}

export interface MapProps {
  onRegionChange: (bounds: Bounds) => void;
  children?: React.ReactNode;
  visible?: boolean;
}