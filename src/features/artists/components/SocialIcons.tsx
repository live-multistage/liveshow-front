// Brand marks for the socials row on the artist hero. Kept as inline SVGs
// (not lucide-react) so shapes match real platform marks — lucide has no
// X/TikTok brand icon.
interface IconProps {
  size?: number;
}

export function InstagramIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5l5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function XIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M18.9 2H22l-7.6 8.68L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8.1-9.3L1 2h6.9l4.8 6.35L18.9 2Zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20Z" />
    </svg>
  );
}

export function TiktokIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M16.6 2h-3.2v13.6a2.7 2.7 0 1 1-2.7-2.7c.24 0 .48.02.7.07V9.7a5.9 5.9 0 1 0 5.2 5.86V8.4a8.1 8.1 0 0 0 4.6 1.4V6.6a4.8 4.8 0 0 1-4.6-4.6Z" />
    </svg>
  );
}

export function SiteIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  );
}

export const SOCIAL_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  x: XIcon,
  twitter: XIcon,
  tiktok: TiktokIcon,
  site: SiteIcon,
  website: SiteIcon,
};
