import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Zap, Clock, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveUpdate {
  id: string;
  type: "commit" | "energy" | "join" | "leave" | "vibe_shift";
  message: string;
  timestamp: number;
  urgent?: boolean;
}

interface LiveUpdatesScrollProps {
  updates: LiveUpdate[];
  maxHeight?: string;
  showTimestamps?: boolean;
}

export function LiveUpdatesScroll({ 
  updates, 
  maxHeight = "200px", 
  showTimestamps = false 
}: LiveUpdatesScrollProps) {
  const sortedUpdates = React.useMemo(() => 
    [...updates].sort((a, b) => b.timestamp - a.timestamp),
    [updates]
  );

  const getUpdateIcon = (type: LiveUpdate["type"]) => {
    switch (type) {
      case "commit":
      case "join":
        return UserPlus;
      case "energy":
      case "vibe_shift":
        return Zap;
      case "leave":
        return Clock;
      default:
        return Heart;
    }
  };

  const getUpdateColor = (type: LiveUpdate["type"]) => {
    switch (type) {
      case "commit":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "energy":
      case "vibe_shift":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "join":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "leave":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (sortedUpdates.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-sm text-muted-foreground bg-muted/20 rounded"
        style={{ height: maxHeight }}
      >
        No recent activity
      </div>
    );
  }

  return (
    <ScrollArea className="rounded border bg-background/50" style={{ height: maxHeight }}>
      <div className="p-2 space-y-1">
        {sortedUpdates.map((update) => {
          const Icon = getUpdateIcon(update.type);
          return (
            <div
              key={update.id}
              className={cn(
                "flex items-start gap-2 p-2 rounded text-sm transition-colors",
                getUpdateColor(update.type),
                update.urgent && "ring-1 ring-primary/30"
              )}
            >
              <Icon className="w-3 h-3 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{update.message}</div>
                {showTimestamps && (
                  <div className="text-xs opacity-60 mt-0.5">
                    {formatTimeAgo(update.timestamp)}
                  </div>
                )}
              </div>
              {update.urgent && (
                <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                  Hot
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}