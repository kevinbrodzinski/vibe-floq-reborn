import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { registerMapboxWorker } from '@/lib/geo/registerMapboxWorker';
import { getMapboxToken }       from '@/lib/geo/getMapboxToken';
import { setMapInstance }       from '@/lib/geo/project';

registerMapboxWorker();

interface Props {
  onRegionChange: (b:{
    minLat:number; minLng:number; maxLat:number; maxLng:number; zoom:number;
  })=>void;
  children?:React.ReactNode;
  visible?: boolean;
}

export const FieldWebMap:React.FC<Props> = ({ onRegionChange, children, visible = true })=>{
  const container = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<mapboxgl.Map|null>(null);

  const [status,setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [err,setErr]       = useState<string>();

  useEffect(()=>{
    if(!container.current||mapRef.current) return;
    let dead=false;

    (async ()=>{
      try{
        const{token}=await getMapboxToken();
        mapboxgl.accessToken=token;

        const map=new mapboxgl.Map({
          container:container.current!,
          style:'mapbox://styles/mapbox/dark-v11',
          center:[-118.24,34.05],
          zoom:11
        });
        mapRef.current=map;

        const fire=()=>{
          const b=map.getBounds();
          onRegionChange({
            minLat:b.getSouth(),minLng:b.getWest(),
            maxLat:b.getNorth(),maxLng:b.getEast(),
            zoom:map.getZoom()
          });
        };

        map.once('load',()=>{
          if(dead) return;
          setMapInstance(map);
          fire();
          map.on('moveend',fire);
          setStatus('ready');
        });

        map.on('error',e=>{
          if(dead) return;
          setErr(e.error?.message || 'unknown');
          setStatus('error');
        });
      }catch(e:any){
        if(!dead){setErr(e.message);setStatus('error');}
      }
    })();

    return()=>{
      dead=true;
      if(mapRef.current){
        mapRef.current.remove();
        mapRef.current=null;
        setMapInstance(null);
      }
    };
  },[onRegionChange]);

  /* render */
  return(
    <div className="absolute inset-0">
      <div ref={container} data-map-container className="absolute inset-0"/>
      {status==='loading'&&(
        <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
          <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"/>
        </div>
      )}
      {status==='error'&&(
        <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
          <div className="text-center">
            <p className="text-sm text-destructive mb-1">Map error</p>
            {err&&<p className="text-xs text-muted-foreground">{err}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
};