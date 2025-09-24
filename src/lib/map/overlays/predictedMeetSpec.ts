import type mapboxgl from 'mapbox-gl';

const SRC='pm:src';
const DOT='pm:dot', RING_A='pm:ringA', RING_B='pm:ringB';

export function createPredictedMeetSpec(){
  return {
    id:'predicted-meet',
    mount(map: mapboxgl.Map){
      if (!map.getSource(SRC)){
        map.addSource(SRC,{ type:'geojson', data:{ type:'FeatureCollection', features:[] } as any });
      }
      // Base dot
      if (!map.getLayer(DOT)){
        map.addLayer({
          id:DOT, type:'circle', source:SRC,
          filter:['==',['get','kind'],'dot'],
          paint:{
            'circle-radius': 4,
            'circle-color': ['coalesce',['get','color'],'#EC4899'],
            'circle-opacity': 0.95,
            'circle-stroke-color':'#fff',
            'circle-stroke-width':1
          }
        });
      }
      // Inner ring (gradient A)
      if (!map.getLayer(RING_A)){
        map.addLayer({
          id:RING_A, type:'circle', source:SRC,
          filter:['==',['get','kind'],'ringA'],
          paint:{
            'circle-radius': ['get','r'],
            'circle-color': ['coalesce',['get','color'],'#EC4899'],
            'circle-opacity': ['get','o']
          }
        });
      }
      // Outer ring (gradient B)
      if (!map.getLayer(RING_B)){
        map.addLayer({
          id:RING_B, type:'circle', source:SRC,
          filter:['==',['get','kind'],'ringB'],
          paint:{
            'circle-radius': ['get','r'],
            'circle-color': ['coalesce',['get','color'],'#EC4899'],
            'circle-opacity': ['get','o']
          }
        });
      }
    },
    update(map: mapboxgl.Map, fc: GeoJSON.FeatureCollection){
      const src = map.getSource(SRC) as mapboxgl.GeoJSONSource|undefined;
      if (src) src.setData(fc as any);
    },
    unmount(map: mapboxgl.Map){
      [RING_B,RING_A,DOT].forEach(id=>{ try{ map.getLayer(id)&&map.removeLayer(id) }catch{} });
      try{ map.getSource(SRC)&&map.removeSource(SRC) }catch{}
    }
  };
}