import * as React from "react";
import { Button } from "@/components/ui/button";

export function FloqCarousel({ children }: { children: React.ReactNode[] }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [i, setI] = React.useState(0);
  const len = React.Children.count(children);

  const toIndex = (idx: number) => {
    const scroller = ref.current;
    if (!scroller) return;
    const el = scroller.children[idx] as HTMLElement | undefined;
    if (!el) return;
    
    // Calculate scroll position manually to prevent page scrolling
    const scrollLeft = el.offsetLeft - scroller.offsetLeft;
    scroller.scrollTo({ left: scrollLeft, behavior: "smooth" });
    setI(idx);
  };
  const prev = () => toIndex((i - 1 + len) % len);
  const next = () => toIndex((i + 1) % len);

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
      {/* Atmospheric glow background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none rounded-lg -z-10" />
      
      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-2 no-scrollbar"
           style={{ scrollBehavior: "smooth" }}>
        {React.Children.map(children, (child, idx) => (
          <div key={idx} className="snap-center shrink-0 w-[88vw] max-w-[700px] relative">
            {/* Slide glow when in center */}
            {idx === i && (
              <div className="absolute -inset-2 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-xl -z-10 animate-pulse" />
            )}
            {child}
          </div>
        ))}
      </div>

      {len > 1 && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
            <Button 
              size="icon" 
              variant="secondary" 
              className="pointer-events-auto h-8 w-8 rounded-full bg-background/60 hover:bg-background/80 backdrop-blur-sm border border-border/30 shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-110" 
              onClick={prev}
            >
              ‹
            </Button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
            <Button 
              size="icon" 
              variant="secondary" 
              className="pointer-events-auto h-8 w-8 rounded-full bg-background/60 hover:bg-background/80 backdrop-blur-sm border border-border/30 shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-110" 
              onClick={next}
            >
              ›
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {Array.from({ length: len }).map((_, k) => (
              <button 
                key={k} 
                aria-label={`Go to slide ${k+1}`} 
                onClick={()=>toIndex(k)}
                className={`
                  h-2 w-2 rounded-full transition-all duration-300 
                  ${i===k 
                    ? "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)] scale-125" 
                    : "bg-muted-foreground/40 hover:bg-muted-foreground/60 hover:scale-110"
                  }
                `} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}