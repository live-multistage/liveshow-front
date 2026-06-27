import { create } from 'zustand';

interface NavigationLoadingStore {
  isNavigating: boolean;
  start: () => void;
  stop: () => void;
}

export const useNavigationLoadingStore = create<NavigationLoadingStore>((set) => ({
  isNavigating: false,
  start: () => set({ isNavigating: true }),
  stop: () => set({ isNavigating: false }),
}));
