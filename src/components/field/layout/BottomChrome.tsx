import * as React from 'react';
import { useOverlayInsets } from './OverlayInsets';

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
    <div
      ref={ref}
      className="fixed left-0 right-0 z-[620]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 56px)' /* tabbar height */ }}
    >
      <div className="px-3">{children}</div>
      <div className="pointer-events-none h-6 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}