import { ScatterplotLayer, ScatterplotLayerProps } from '@deck.gl/layers';

interface LocationPoint {
  position: [number, number];
}

export const myLocationLayer = (
  pos: [number, number] | null,
): ScatterplotLayer | null =>
  pos
    ? new ScatterplotLayer({
        id: 'my-location',
        data: [{ position: pos }] as LocationPoint[],
        getPosition: (d: LocationPoint) => d.position,

        // style
        getRadius: 40,
        radiusUnits: 'meters',
        radiusMinPixels: 5,
        getFillColor: [0, 122, 255, 230],
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 1.5,

        pickable: false,
        parameters: { depthMask: false },
      } as ScatterplotLayerProps)
    : null;