export { seriesService } from './services/series.service';
export { seriesKeys, useSeriesListQuery, useSeriesQuery } from './queries/series.queries';
// fetchSeries/fetchSeriesBySlug (get-series.server.ts) are intentionally not
// re-exported here — same as get-channels.server.ts/fetchChannels — so this
// client-safe barrel never pulls in the React Server Components-only
// `cache()` import. Server pages import that file directly.
export { getRecurrenceParts, formatStartTime } from './utils/recurrence';
export { episodeToShow } from './utils/episode-adapter';
export { SeriesBadge } from './components/SeriesBadge';
export { SeriesCard } from './components/SeriesCard';
export { SeriesRail } from './components/SeriesRail';
export { SeriesPageContent } from './components/SeriesPageContent';
export type {
  SeriesStatus,
  SeriesEpisode,
  SeriesResponse,
  SeriesListItem,
  SeasonPass,
  SeriesDetail,
} from './types/series.types';
