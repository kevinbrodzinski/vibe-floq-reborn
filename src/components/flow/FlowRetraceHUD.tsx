import * as React from 'react';
import { useFlowRoute } from '@/hooks/useFlowRoute';

export function FlowRetraceHUD() {
  const { isRetracing, currentRetraceIndex, flowRoute } = useFlowRoute() as any;
  if (!isRetracing || !flowRoute?.length) return null;
  const total = flowRoute.length;
  const step = Math.max(1, total - currentRetraceIndex);
  return (
    <>
      <style>{`
        @keyframes flow-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[620] pointer-events-none"
        role="status"
        aria-live="polite"
      >
        <div className="px-3 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl text-white text-xs font-medium flex items-center gap-2 pointer-events-auto">
          <span aria-label="retrace progress">{step} / {total}</span>
          <span className="relative block w-16 h-1.5 overflow-hidden rounded" aria-hidden="true">
            <span
              className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 opacity-40"
              style={{ animation: 'flow-shimmer 3s linear infinite' }}
            />
          </span>
        </div>
      </div>
    </>
  );
}