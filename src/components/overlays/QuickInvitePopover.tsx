// src/components/overlays/QuickInvitePopover.tsx
import React from 'react';

export function QuickInvitePopover({
  userId, onClose, onInvite, onDM, onAddToPlan
}: {
  userId: string;
  onClose: () => void;
  onInvite: (id: string) => void;
  onDM?: (id: string) => void;
  onAddToPlan?: (id: string) => void;
}) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[610] bg-black/60 backdrop-blur
                 px-16 py-12 rounded-2xl flex items-center gap-12"
      style={{ border: '1px solid rgba(255,255,255,0.2)' }}
      role="dialog" aria-label="Quick invite"
    >
      <div className="text-white/90 text-sm">Invite this friend?</div>

      <button
        onClick={() => onInvite(userId)}
        className="px-12 py-8 rounded-xl text-sm bg-white/20 text-white hover:bg-white/30"
      >
        Invite to Tonight
      </button>

      {onDM && (
        <button onClick={() => onDM(userId)} className="px-12 py-8 rounded-xl text-sm bg-white/10 text-white/80">
          DM
        </button>
      )}

      {onAddToPlan && (
        <button onClick={() => onAddToPlan(userId)} className="px-12 py-8 rounded-xl text-sm bg-white/10 text-white/80">
          Add to Plan
        </button>
      )}

      <button onClick={onClose} className="px-12 py-8 rounded-xl text-sm bg-white/10 text-white/80">
        Cancel
      </button>
    </div>
  );
}