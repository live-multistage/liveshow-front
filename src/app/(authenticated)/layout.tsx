import { Navbar } from '@/shared/components/Navbar';
import { Providers } from '@/providers';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Navbar />
      {children}
    </Providers>
  );
}
