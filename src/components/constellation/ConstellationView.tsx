import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFloqsHubData } from "@/hooks/useFloqsHubData";
import { ConstellationCanvas } from "./ConstellationCanvas";

export function ConstellationView({ onClose }: { onClose: () => void }) {
  const { constellationNodes } = useFloqsHubData();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Constellation</DialogTitle>
        </DialogHeader>
        <div className="h-[70vh] w-full overflow-hidden rounded-md bg-muted">
          <ConstellationCanvas nodes={constellationNodes} />
        </div>
      </DialogContent>
    </Dialog>
  );
}