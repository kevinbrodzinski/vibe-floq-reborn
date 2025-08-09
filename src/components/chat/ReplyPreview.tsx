import { cn } from "@/lib/utils";

export function ReplyPreview({
  text,
  onClick,
  align = "left",
}: {
  text: string;
  onClick?: () => void;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "mb-1 w-full rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-xs text-foreground/80",
        align === "right" ? "self-end" : "self-start",
        "shadow-sm cursor-pointer"
      )}
      onClick={onClick}
      role="button"
      title="View replied message"
    >
      <div className="mb-1 font-medium opacity-80">Replied to</div>
      <div className="line-clamp-2 break-words overflow-hidden">
        {text || "(deleted message)"}
      </div>
    </div>
  );
}