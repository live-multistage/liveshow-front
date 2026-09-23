// Shared by AccountShell's identity card and SettingsPageContent's profile card.
export function initials(name?: string): string {
  return (name ?? '?').split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase();
}
