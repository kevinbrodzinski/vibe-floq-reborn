import { cn } from "@/lib/utils";

export function ReactionsRow({
  list,
  align = "left",
  onToggle,
  currentUserId,
}: {
  list: Array<{ emoji: string; count: number; reactors: string[] }>;
  align?: "left" | "right";
  onToggle: (emoji: string) => void;
  currentUserId: string;
}) {
  const MAX = 3;
  const display = (list ?? []).slice(0, MAX);
  const overflow = Math.max(0, (list?.length ?? 0) - display.length);

  return (
    <div className={cn("mt-1 flex gap-2", align === "right" ? "justify-end" : "justify-start")}>
      {display.map((r) => {
        const mine = r.reactors.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            onClick={() => onToggle(r.emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs",
              "transition-colors",
              mine
                ? "border-primary/50 bg-primary/10 ring-1 ring-primary/20"
                : "border-border/50 bg-background/40 hover:bg-muted/50"
            )}
          >
            <span>{r.emoji}</span>
            {r.count > 1 && <span>{r.count}</span>}
          </button>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full border border-border/50 bg-background/40 px-2 py-[2px] text-xs text-foreground/70">
          +{overflow}
        </span>
      )}
    </div>
  );
}