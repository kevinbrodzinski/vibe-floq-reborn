export interface ViewportBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom: number;
}

export interface BaseMapProps {
  onRegionChange: (b: ViewportBounds) => void;
  children?: React.ReactNode;
  /** when false, map doesn’t mount (safe for hidden sheets) */
  visible?: boolean;
}