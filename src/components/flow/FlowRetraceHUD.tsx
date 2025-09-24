import * as React from 'react';
import { onEvent, Events } from '@/services/eventBridge';

export function FlowRetraceHUD(){
  const [visible,setVisible]=React.useState(false);
  const [total,setTotal]=React.useState(0);
  const [idx,setIdx]=React.useState<number|null>(null);

  React.useEffect(()=>{
    const offShow = onEvent(Events.FLOQ_FLOW_SHOW,(p)=>{ setVisible(true); setTotal((p?.path??[]).length); });
    const offHide = onEvent(Events.FLOQ_FLOW_HIDE,()=>{ setVisible(false); setIdx(null); setTotal(0); });
    const offGoto = onEvent(Events.FLOQ_FLOW_RETRACE_GOTO,(p)=> setIdx(p?.index ?? 0));
    return ()=>{ offShow(); offHide(); offGoto(); };
  },[]);

  if (!visible || total<=1 || idx===null) return null;
  const step = Math.max(1,total-idx);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-[calc(16px+env(safe-area-inset-top))] z-[610] -translate-x-1/2"
    >
      <div className="relative overflow-hidden rounded-full border border-white/10 bg-black/80 px-3 py-1.5 text-white/90 shadow-lg backdrop-blur-md">
        <div className="relative flex items-center gap-2 text-xs font-medium">
          <span>Retrace</span>
          <span aria-label={`Step ${step} of ${total}`}>{step} / {total}</span>
          <span className="ml-2 inline-block h-[2px] w-24 overflow-hidden rounded bg-white/10">
            <span
              className="block h-full w-1/2 bg-gradient-to-r from-pink-500 to-violet-500"
              style={{
                animation:'flowHudShimmer 3s ease-in-out infinite',
                transformOrigin:'left'
              }}
            />
          </span>
        </div>
      </div>
      <style>{`
        @keyframes flowHudShimmer { 0%{ transform: translateX(-100%);} 100%{ transform: translateX(200%);} }
      `}</style>
    </div>
  );
}