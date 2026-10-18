export const chatKeys = {
  all: ['chat'] as const,
  recent: (eventId: string, streamId: string | null = null) => ['chat', 'recent', eventId, streamId] as const,
  participants: (eventId: string, streamId: string | null, q: string) =>
    ['chat', 'participants', eventId, streamId, q] as const,
};
