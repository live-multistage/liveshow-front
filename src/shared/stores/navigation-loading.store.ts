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

// A navigation to the URL the user is already on never triggers a pathname/
// searchParams change, so NavigationEvents' stop() effect would never fire and
// the overlay would spin forever. Callers of start() use this to skip those.
export function isCurrentUrl(href: string): boolean {
  if (typeof window === 'undefined') return false;
  const target = new URL(href, window.location.href);
  return target.pathname === window.location.pathname && target.search === window.location.search;
}
