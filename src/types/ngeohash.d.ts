declare module 'ngeohash' {
  export function encode(lat: number, lng: number, precision?: number): string;
  export function decode(hash: string): { latitude: number; longitude: number };
  export function decode_bbox(hash: string): [number, number, number, number];
  export function neighbors(hash: string): string[];
}