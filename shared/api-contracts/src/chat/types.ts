export const REACTION_EMOJIS = ['💜', '🔥', '🤘', '👏', '✨'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ChatMention {
  userId: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  eventId: string;
  userId: string;
  authorName: string;
  body: string;
  sentAt: string; // ISO
  streamId: string | null; // transmission room; null = event without streams
  authorUsername: string | null; // author's @handle at post time
  mentions: ChatMention[]; // resolved server-side at send; body keeps the literal @username
}

export interface ChatMe {
  canWrite: boolean;
  isMuted: boolean;
  isModerator: boolean;
}

export interface ChatRecentResponse {
  messages: ChatMessage[];
  me: ChatMe | null; // null = anônimo
}

export type ChatStreamEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'message.deleted'; messageId: string }
  | { type: 'reactions'; counts: Record<ReactionEmoji, number> }
  | { type: 'muted'; userId: string; muted: boolean };

export const CHAT_ERROR_CODES = {
  FORBIDDEN: 'CHAT_FORBIDDEN',
  MUTED: 'CHAT_MUTED',
  RATE_LIMITED: 'CHAT_RATE_LIMITED',
} as const;

export const CHAT_MESSAGE_MAX_LENGTH = 280;

/** One row of `GET /chat/events/:eventId/participants?streamId=&q=` (max 6). */
export interface ChatParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}
