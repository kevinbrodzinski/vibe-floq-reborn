import React from 'react';
import { VibeDensityMap } from '@/components/VibeDensityMap';

/* Props match the state held in VibeScreen ------------------------- */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VibeDensityModal: React.FC<Props> = ({
  open,
  onOpenChange,
}) => {
  if (!open) return null;                    // keep DOM clean when closed
  return (
    <VibeDensityMap
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};