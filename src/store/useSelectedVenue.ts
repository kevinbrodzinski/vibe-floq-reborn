import { create } from 'zustand';

interface SelectedVenueStore {
  selectedVenueId: string | null;
  setSelectedVenueId: (id: string | null) => void;
}

export const useSelectedVenue = create<SelectedVenueStore>((set) => ({
  selectedVenueId: null,
  setSelectedVenueId: (id) => set({ selectedVenueId: id }),
}));