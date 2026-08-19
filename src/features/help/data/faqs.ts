import type { FaqEntry, FaqFilter } from '../types/faq.types';

export const FAQ_FILTERS: FaqFilter[] = ['all', 'tickets', 'streaming', 'replays', 'account'];

// A ordem aqui é a ordem na página: as dúvidas de compra vêm primeiro porque
// são as que trazem mais gente à central de ajuda.
export const FAQS: FaqEntry[] = [
  { id: 'findEvent', category: 'tickets' },
  { id: 'venueTicket', category: 'tickets' },
  { id: 'cameraAngles', category: 'streaming' },
  { id: 'streamDown', category: 'streaming' },
  { id: 'replayWindow', category: 'replays' },
  { id: 'replayAngles', category: 'replays' },
  { id: 'devices', category: 'account' },
  { id: 'refund', category: 'account' },
];
