import * as React from 'react';
import { onEvent, Events } from '@/services/eventBridge';
import { openTransitFirstOrRideshare } from '@/lib/nav/directions';

export function DirectionsBridge(){
  React.useEffect(()=>{
    return onEvent(Events.UI_OPEN_DIRECTIONS, ({ lat, lng, label, mode })=>{
      try { openTransitFirstOrRideshare({ dest:{ lat, lng }, label, mode }); } catch {}
    });
  },[]);
  return null;
}