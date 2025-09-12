import * as React from 'react';
import { useOverlayInsets } from './OverlayInsetsProvider';

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
    <div ref={ref} className="fixed top-0 left-0 right-0 z-[560]">
      {children}
    </div>
  );
}