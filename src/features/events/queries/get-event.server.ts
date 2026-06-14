import { cache } from 'react';
import { eventsService } from '../services/events.service';

// Dedupes the event fetch across generateMetadata + page render in one request.
export const getEventCached = cache((id: string) => eventsService.getEvent(id));
