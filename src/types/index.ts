export type UserRole = 'USER' | 'ORGANIZER' | 'ARTIST' | 'ADMIN';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
