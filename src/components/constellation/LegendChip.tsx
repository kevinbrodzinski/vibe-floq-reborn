import * as React from "react";

function Dot({ varName }: { varName: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: `hsl(var(${varName}))` }}
      aria-hidden
    />
  );
}

function Line({ varName }: { varName: string }) {
  return (
    <svg width="28" height="8" className="inline-block align-middle" aria-hidden>
      <line x1="1" y1="4" x2="27" y2="4"
        stroke={`hsl(var(${varName}))`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LegendChip() {
  const [show, setShow] = React.useState(true);
  const [pinned, setPinned] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("floq_constellation_legend_pinned") === "1";
  });

  React.useEffect(() => {
    if (pinned) return;
    const t = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(t);
  }, [pinned]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("floq_constellation_legend_pinned", next ? "1" : "0");
    }
    if (next) setShow(true);
  };

  if (!show && !pinned) return (
    <button
      className="rounded-md bg-background/60 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur hover:text-foreground"
      onClick={() => setShow(true)}
      aria-label="Show constellation legend"
    >
      Legend
    </button>
  );

  return (
    <div className="flex items-center gap-3 rounded-md bg-background/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
      {/* Nodes */}
      <div className="flex items-center gap-1.5">
        <Dot varName="--floq-live" /><span>Live</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Dot varName="--floq-soon" /><span>Upcoming</span>
      </div>

      {/* Edges */}
      <div className="flex items-center gap-1.5">
        <Line varName="--floq-edge-time" /><span>Time proximity</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Line varName="--floq-edge-friend" /><span>Friend overlap</span>
      </div>

      {/* Controls */}
      <div className="ml-1 flex items-center gap-2">
        <button
          onClick={() => setShow(false)}
          className="rounded px-1 py-0.5 hover:text-foreground"
          aria-label="Hide legend"
          title="Hide"
        >
          Hide
        </button>
        <button
          onClick={togglePin}
          className="rounded px-1 py-0.5 hover:text-foreground"
          aria-pressed={pinned}
          aria-label={pinned ? "Unpin legend" : "Pin legend"}
          title={pinned ? "Unpin" : "Always show"}
        >
          {pinned ? "Unpin" : "Pin"}
        </button>
      </div>
    </div>
  );
}