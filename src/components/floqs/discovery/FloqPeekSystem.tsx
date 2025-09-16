import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FloqDiscoveryView } from "./FloqDiscoveryView";
import { FloqConsideringView } from "./FloqConsideringView";
import { FlockCommandCenter } from "./FlockCommandCenter";
import { useJoinIntent } from "@/hooks/useJoinIntent";
import { useFloqsHubData } from "@/hooks/useFloqsHubData";
import type { FloqCardItem } from "../cards/FloqCard";

const PEEK_FALLBACK = {
  id: "__peek_fallback__", 
  name: "Loading", 
  status: "live",
  participants: 0, 
  friends_in: 0, 
  recsys_score: 0.5, 
  energy_now: 0.5, 
  energy_peak: 0.7
} as any;

export function FloqPeekSystem() {
  const [open, setOpen] = React.useState(false);
  const [floqId, setFloqId] = React.useState<string | null>(null);
  
  // Get commitment stage for this floq
  const { stage, setStage } = useJoinIntent(floqId);
  
  // Fast-path fetch from hub cache
  const hub = useFloqsHubData();
  const item: FloqCardItem = 
    hub.momentaryLive.find(x => x.id === floqId) ??
    hub.tribes.find(x => x.id === floqId) ??
    hub.publicFloqs.find(x => x.id === floqId) ??
    hub.discover.find(x => x.id === floqId) ??
    PEEK_FALLBACK;

  // Event bus (web-safe + SSR guard)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string; stage?: "watch" | "consider" | "commit" }>;
      const targetId = ce.detail?.id;
      const initialStage = ce.detail?.stage;
      
      if (targetId) {
        setFloqId(targetId);
        if (initialStage) {
          setStage(initialStage);
        }
        setOpen(true);
      }
    };
    
    window.addEventListener("floq:peek", onOpen as any);
    return () => window.removeEventListener("floq:peek", onOpen as any);
  }, [setStage]);

  const handleCommitmentChange = (newStage: "watch" | "consider" | "commit") => {
    setStage(newStage);
    
    // If user commits, they might want to close the peek and go to full floq
    if (newStage === "commit" && floqId) {
      // Navigate to full floq page after a short delay
      setTimeout(() => {
        setOpen(false);
        // Use window.location for direct navigation since useNavigate isn't available in this context
        window.location.href = `/floqs/${floqId}`;
      }, 1500);
    }
  };

  const handleAction = (action: string, data?: any) => {
    console.log("Flock action:", action, data);
    // Handle coordination actions like rally point, notifications, etc.
  };

  const onClose = () => {
    setOpen(false);
    setFloqId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        {/* Progressive disclosure based on commitment stage */}
        {stage === "watch" && (
          <FloqDiscoveryView 
            item={item}
            onCommitmentChange={handleCommitmentChange}
            currentStage={stage}
          />
        )}
        
        {stage === "consider" && (
          <FloqConsideringView 
            item={item}
            onCommitmentChange={handleCommitmentChange}
            currentStage={stage}
          />
        )}
        
        {stage === "commit" && (
          <FlockCommandCenter 
            item={item}
            onAction={handleAction}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}