/** small helper that returns a GeoJSON feature for the current user */
export function buildSelfFeature(
  lngLat: [number, number],
  userId: string
): GeoJSON.Feature<GeoJSON.Point, { self: true; id: string }> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: lngLat },
    properties: { self: true, id: userId },
  };
}