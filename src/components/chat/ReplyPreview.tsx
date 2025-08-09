import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile"; // Use the correct hook that handles undefined

export function ReplyPreview({
  text,
  profileId,
  authorName,
  onClick,
  align = "left",
  integrated = false,
}: {
  text: string;
  profileId?: string | null;
  authorName?: string;
  onClick?: () => void;
  align?: "left" | "right";
  integrated?: boolean;
}) {
  // Fetch author profile if we have a profileId but no authorName
  const { data: authorProfile } = useProfile(profileId || undefined); // This hook handles undefined properly
  
  const displayName = authorName || 
    authorProfile?.display_name || 
    authorProfile?.username || 
    "Someone";

  if (integrated) {
    // Instagram/WhatsApp style - integrated into message bubble
    return (
      <div
        className={cn(
          "mb-2 border-l-2 pl-2 cursor-pointer",
          align === "right" ? "border-primary-foreground/30" : "border-primary/40"
        )}
        onClick={onClick}
        role="button"
        title="View replied message"
      >
        <div className={cn(
          "text-xs font-medium mb-0.5",
          align === "right" ? "text-primary-foreground/80" : "text-primary"
        )}>
          {displayName}
        </div>
        <div className={cn(
          "text-xs opacity-80 line-clamp-2 break-words",
          align === "right" ? "text-primary-foreground/70" : "text-foreground/70"
        )}>
          {text || "This message was deleted"}
        </div>
      </div>
    );
  }

  // Legacy standalone style (for compatibility)
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