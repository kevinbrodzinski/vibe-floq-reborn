import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConstellationCanvas } from "./ConstellationCanvas";
import { useFloqsHubData, ConstellationNode, ConstellationEdge } from "@/hooks/useFloqsHubData";
import { LegendChip } from "./LegendChip";

export function ConstellationView({
  onClose, nodes, edges,
}: {
  onClose: () => void;
  nodes?: ConstellationNode[];
  edges?: ConstellationEdge[];
}) {
  const hub = useFloqsHubData();
  const n = nodes ?? hub.constellationNodes;
  const e = edges ?? hub.constellationEdges;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>Constellation</DialogTitle></DialogHeader>
        <div className="relative h-[70vh] w-full overflow-hidden rounded-md bg-muted">
          <ConstellationCanvas nodes={n} edges={e} />
          <div className="pointer-events-auto absolute bottom-3 left-3"><LegendChip /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}