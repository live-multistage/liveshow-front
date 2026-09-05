// physical_tickets is a per-org beta flag with no member-readable org
// endpoint yet (TODO in get-feature-flags.server.ts). Gating on the global
// flag would 404 staff at orgs where it's only on via an org override we
// can't see from here, so check-in fails open instead of 404ing.
export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
