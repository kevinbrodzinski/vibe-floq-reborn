import { useState } from 'react';

export interface PlanOverlayController {
  showInvite: boolean;
  showDetails: boolean;
  openInviteOverlay: () => void;
  openPlanDetail: () => void;
  closeInvite: () => void;
  closeDetails: () => void;
  closeAll: () => void;
}

export function usePlanOverlayController(): PlanOverlayController {
  const [showInvite, setShowInvite] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return {
    showInvite,
    showDetails,
    openInviteOverlay: () => setShowInvite(true),
    openPlanDetail: () => setShowDetails(true),
    closeInvite: () => setShowInvite(false),
    closeDetails: () => setShowDetails(false),
    closeAll: () => {
      setShowInvite(false);
      setShowDetails(false);
    }
  };
}