import mapboxgl from 'mapbox-gl';
import MapboxWorker from 'mapbox-gl/dist/mapbox-gl-csp-worker.js?worker';

export function registerMapboxWorker() {
  (mapboxgl as any).workerClass = MapboxWorker;
}