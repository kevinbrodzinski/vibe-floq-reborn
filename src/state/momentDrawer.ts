import { create } from 'zustand';
import type { AfterglowMoment } from '@/hooks/useAfterglowData';

interface MomentDrawerState {
  open: boolean;
  moment: AfterglowMoment | null;
  openMomentDrawer: (moment: AfterglowMoment) => void;
  close: () => void;
}

export const useMomentDrawer = create<MomentDrawerState>((set) => ({
  open: false,
  moment: null,
  openMomentDrawer: (moment: AfterglowMoment) => set({ open: true, moment }),
  close: () => set({ open: false, moment: null }),
}));

// Helper function for components that don't use hooks
export const openMomentDrawer = (moment: AfterglowMoment) => {
  useMomentDrawer.getState().openMomentDrawer(moment);
};