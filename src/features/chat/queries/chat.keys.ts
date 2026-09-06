export const chatKeys = {
  all: ['chat'] as const,
  recent: (eventId: string) => ['chat', 'recent', eventId] as const,
};
