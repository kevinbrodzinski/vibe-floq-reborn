export const metersToPixelsAtLat = (lat: number, zoom: number) =>
  (Math.cos((lat * Math.PI) / 180) * 2 ** zoom) / 156_543.03392;  // Mapbox formula