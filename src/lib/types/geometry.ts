/** GeoJSON representation returned by PostgREST for geometry(Point,4326) */
export interface GeometryPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/** Runtime guard */
export const isGeometryPoint = (v: unknown): v is GeometryPoint =>
  !!v &&
  (v as any).type === 'Point' &&
  Array.isArray((v as any).coordinates) &&
  (v as any).coordinates.length === 2 &&
  typeof (v as any).coordinates[0] === 'number' &&
  typeof (v as any).coordinates[1] === 'number';