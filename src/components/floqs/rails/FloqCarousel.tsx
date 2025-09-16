import * as React from "react";
import { Button } from "@/components/ui/button";

export function FloqCarousel({
  children, // array of slides
}: { children: React.ReactNode[] }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [i, setI] = React.useState(0);

  const len = React.Children.count(children);

  const toIndex = (idx: number) => {
    if (!ref.current) return;
    const el = ref.current.children[idx] as HTMLElement | undefined;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setI(idx);
  };

  const prev = () => toIndex((i - 1 + len) % len);
  const next = () => toIndex((i + 1) % len);

  // update indicator on scroll
  React.useEffect(() => {
    const scroller = ref.current;
    if (!scroller) return;
    const handler = () => {
      const cards = Array.from(scroller.children) as HTMLElement[];
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      const idx = cards.findIndex((c) => c.offsetLeft <= mid && (c.offsetLeft + c.clientWidth) > mid);
      if (idx >= 0) setI(idx);
    };
    scroller.addEventListener("scroll", handler, { passive: true });
    return () => scroller.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {React.Children.map(children, (child, idx) => (
          <div key={idx} className="snap-center shrink-0 w-[88vw] max-w-[700px]">{child}</div>
        ))}
      </div>

      {/* Controls */}
      {len > 1 && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
            <Button onClick={prev} size="icon" variant="secondary" className="pointer-events-auto h-8 w-8 rounded-full">‹</Button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
            <Button onClick={next} size="icon" variant="secondary" className="pointer-events-auto h-8 w-8 rounded-full">›</Button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            {Array.from({ length: len }).map((_, k) => (
              <button
                key={k}
                aria-label={`Go to slide ${k+1}`}
                onClick={()=>toIndex(k)}
                className={`h-2 w-2 rounded-full ${i===k ? "bg-foreground" : "bg-muted-foreground/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}