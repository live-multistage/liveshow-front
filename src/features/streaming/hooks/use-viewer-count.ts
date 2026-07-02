import { useQuery } from '@tanstack/react-query';
import { viewerTrackingService } from '../services/viewer-tracking.service';

export function useViewerCount(eventId: string | undefined) {
  const query = useQuery({
    queryKey: ['viewers', 'count', eventId],
    queryFn: () => viewerTrackingService.getViewers(eventId!),
    enabled: !!eventId,
    refetchInterval: 25_000,
    staleTime: 20_000,
  });

  return {
    currentViewers: query.data?.currentViewers ?? 0,
    totalViews: query.data?.totalViews ?? 0,
    isLoading: query.isLoading,
  };
}
