import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserPlus, Info, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanDetailSheet } from './PlanDetailSheet';
import { InviteOverlay } from './InviteOverlay';
import { usePlanOverlayController } from '@/hooks/usePlanOverlayController';

interface PlanActionFabProps {
  plan?: {
    id: string;
    title: string;
    description?: string;
    planned_at: string;
    status: string;
    location?: any;
    vibe_tag?: string;
    creator_id: string;
    floq_id: string;
    participants?: Array<{
      id: string;
      username: string;
      display_name?: string;
      avatar_url?: string;
    }>;
    stops?: Array<{
      id: string;
      title: string;
      description?: string;
      location: any;
      stop_order: number;
    }>;
  };
  onEdit?: () => void;
}

export function PlanActionFab({ plan, onEdit }: PlanActionFabProps) {
  const [expanded, setExpanded] = useState(false);
  const overlayController = usePlanOverlayController();

  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-2 bg-card/90 backdrop-blur-sm">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={overlayController.openInviteOverlay}
                  className="justify-start gap-2 h-10"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Friends
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={overlayController.openPlanDetail}
                  className="justify-start gap-2 h-10"
                >
                  <Info className="w-4 h-4" />
                  Plan Details
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={toggleExpanded}
        size="icon"
        className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-pulse-glow"
      >
        {expanded ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </Button>

      {/* Overlays */}
      <PlanDetailSheet
        open={overlayController.showDetails}
        onOpenChange={overlayController.closeDetails}
        plan={plan}
        onInvite={overlayController.openInviteOverlay}
        onEdit={onEdit}
      />

      <InviteOverlay
        open={overlayController.showInvite}
        onClose={overlayController.closeInvite}
        planId={plan?.id}
        floqId={plan?.floq_id}
      />
    </div>
  );
}