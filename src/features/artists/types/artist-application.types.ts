// Inline feature types (not in @live-show/api-contracts) — mirrors
// organizations/types/organization.types.ts's Organizer*Application pattern.

export interface CreateArtistApplicationRequest {
  artistName: string;
  socialLink?: string;
  genres: string[];
  about: string;
}

export interface ArtistApplicationResponse {
  id: string;
  status: string;
  artistName: string;
  socialLink: string | null;
  genres: string[];
  about: string;
  createdAt: string;
}
