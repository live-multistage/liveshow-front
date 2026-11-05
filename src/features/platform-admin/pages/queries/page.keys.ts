import type { ListPagesParams } from '../services/pages.service';

export const pageKeys = {
  all: ['platform-admin', 'pages'] as const,
  list: (filter: ListPagesParams) => [...pageKeys.all, 'list', filter] as const,
  detail: (id: string) => [...pageKeys.all, 'detail', id] as const,
  versions: (id: string) => [...pageKeys.all, 'versions', id] as const,
  diff: (id: string) => [...pageKeys.all, 'diff', id] as const,
};
