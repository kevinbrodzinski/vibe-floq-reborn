import * as React from 'react';

export function usePerfBudget(sampleMs=1500){
  const [fps, setFps] = React.useState<number>(60);
  const [ok, setOk] = React.useState<boolean>(true);
  React.useEffect(()=>{
    let frames = 0, start = performance.now(), raf = 0;
    const tick = ()=>{ frames++; const now=performance.now(); if (now-start>=sampleMs){ setFps(Math.round((frames*1000)/(now-start))); setOk((frames*1000)/(now-start) >= 40); frames=0; start=now; } raf=requestAnimationFrame(tick) };
    raf=requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(raf);
  },[sampleMs]);
  return { fps, ok };
}