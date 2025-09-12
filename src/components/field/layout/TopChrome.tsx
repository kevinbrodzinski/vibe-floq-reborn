import * as React from 'react';
import { useOverlayInsets } from './OverlayInsets';

export function TopChrome({ children }: { children: React.ReactNode }) {
  const { setTop } = useOverlayInsets();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setTop(ref.current!.offsetHeight));
    ro.observe(ref.current);
    setTop(ref.current.offsetHeight);
    return () => ro.disconnect();
  }, [setTop]);

  return (
    <div
      ref={ref}
      className="fixed left-0 right-0 z-[700]"
      style={{ top: 'env(safe-area-inset-top)', pointerEvents: 'none' }}
    >
      <div className="px-3" style={{ pointerEvents: 'auto' }}>
        {children}
      </div>
      <div className="pointer-events-none h-6 bg-gradient-to-b from-black/40 to-transparent" />
    </div>
  );
}