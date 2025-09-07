export function Phase4Hud({ metrics, counters }:{
  metrics?: { fps?:number; workerTime?:number; drawCalls?:number };
  counters: { windsPaths:number; auroraActive:number; arrowsVisible:number };
}) {
  if (!import.meta.env.DEV) return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('debug')?.includes('phase4')) return null;

  return (
    <div style={{
      position:'fixed', bottom:12, left:12, zIndex:9999, font:'12px system-ui',
      background:'rgba(17,24,39,.6)', color:'#e5e7eb', padding:'8px 10px', borderRadius:8
    }}>
      <div>fps: {metrics?.fps ?? 0}</div>
      <div>worker: {(metrics?.workerTime ?? 0).toFixed(1)} ms</div>
      <div>draws: {metrics?.drawCalls ?? 0}</div>
      <div>winds.paths: {counters.windsPaths}</div>
      <div>arrows.visible: {counters.arrowsVisible}</div>
      <div>aurora.active: {counters.auroraActive}</div>
    </div>
  );
}