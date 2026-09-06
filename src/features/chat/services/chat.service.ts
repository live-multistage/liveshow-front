import { httpClient } from '@/lib/http/client';
import { config } from '@/config';
import type { ChatMessage, ChatRecentResponse, ReactionEmoji } from '@live-show/api-contracts';

export const chatService = {
  recent: (eventId: string) =>
    httpClient.get<ChatRecentResponse>(`/chat/events/${eventId}/messages?limit=50`).then((r) => r.data),

  send: (eventId: string, body: string) =>
    httpClient.post<ChatMessage>(`/chat/events/${eventId}/messages`, { body }).then((r) => r.data),

  react: (eventId: string, emoji: ReactionEmoji) =>
    httpClient.post(`/chat/events/${eventId}/reactions`, { emoji }),

  deleteMessage: (eventId: string, messageId: string) =>
    httpClient.delete(`/chat/events/${eventId}/messages/${messageId}`),

  mute: (eventId: string, userId: string) => httpClient.post(`/chat/events/${eventId}/mutes/${userId}`),

  unmute: (eventId: string, userId: string) => httpClient.delete(`/chat/events/${eventId}/mutes/${userId}`),

  streamUrl: (eventId: string, token: string | null) =>
    `${config.apiUrl}/chat/events/${eventId}/stream${token ? `?token=${token}` : ''}`,
};
