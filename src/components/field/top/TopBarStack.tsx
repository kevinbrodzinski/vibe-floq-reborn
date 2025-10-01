import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;
  rowGap?: number; // px
};

export default function TopBarStack({ children, className, rowGap = 10 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const height = el.getBoundingClientRect().height;
      setH(height);
      document.documentElement.style.setProperty("--topbar-h", `${height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const style = useMemo(() => ({ gap: `${rowGap}px` }), [rowGap]);

  return (
    <div
      className={clsx(
        "pointer-events-none fixed left-0 right-0 z-[700]",
        "top-[calc(env(safe-area-inset-top,0px)+16px)]",
        className
      )}
      aria-label="field-top-ui"
    >
      <div ref={ref} className="mx-auto flex max-w-screen-xl flex-col px-4" style={style}>
        {children}
      </div>
    </div>
  );
}
