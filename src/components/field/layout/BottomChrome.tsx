import * as React from 'react';
import { useOverlayInsets } from './OverlayInsetsProvider';

export function BottomChrome({ children }: { children: React.ReactNode }) {
  const { setBottom } = useOverlayInsets();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setBottom(ref.current!.offsetHeight));
    ro.observe(ref.current);
    setBottom(ref.current.offsetHeight);
    return () => ro.disconnect();
  }, [setBottom]);

  return (
    <div ref={ref} className="fixed bottom-0 left-0 right-0 z-[560] pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}