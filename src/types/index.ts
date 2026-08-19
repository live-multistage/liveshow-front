export type UserRole = 'USER' | 'ORGANIZER' | 'ARTIST' | 'ADMIN' | 'SUPER_ADMIN';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
