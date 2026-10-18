export const chatKeys = {
  all: ['chat'] as const,
  recent: (eventId: string, streamId: string | null = null) => ['chat', 'recent', eventId, streamId] as const,
};
