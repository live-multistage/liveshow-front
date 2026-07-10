import { Navbar } from '@/shared/components/Navbar';

// Providers already wraps the whole app from the root layout — this
// nested wrap was redundant (silently duplicating Toaster/NavigationEvents/
// NavigationOverlay, and would have given Navbar's useAuth() a second,
// independent AuthProvider that never gets the SSR-seeded login state).
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
