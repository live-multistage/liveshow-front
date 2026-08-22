import { httpClient } from '@/lib/http/client';
import type { SeriesDetail, SeriesListItem } from '../types/series.types';

export const seriesService = {
  list: async (): Promise<SeriesListItem[]> => {
    const { data } = await httpClient.get<SeriesListItem[]>('/series');
    return data;
  },

  getBySlug: async (slug: string): Promise<SeriesDetail> => {
    const { data } = await httpClient.get<SeriesDetail>(`/series/${slug}`);
    return data;
  },
};
