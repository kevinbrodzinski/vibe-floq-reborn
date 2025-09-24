import { AnyLayer } from 'mapbox-gl';

/** Renders the blue "YOU" dot on top of the generic people layer */
export const selfLayer: AnyLayer = {
  id     : 'me-pin',
  type   : 'circle',
  source : 'people',                // same source as other Person dots
  filter : ['==', ['get', 'self'], true],
  paint  : {
    'circle-radius'       : 6,
    'circle-color'        : '#3683FF',
    'circle-stroke-width' : 2,
    'circle-stroke-color' : '#FFFFFF',
  },
};