export interface ChatMessage {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  body: string;
  // ISO timestamp — formatted for display where it's rendered (ChatMessageItem),
  // not here, so this type stays serialization-friendly for a future API.
  sentAt: string;
}

export type ReactionEmoji = '💜' | '🔥' | '🤘' | '👏' | '✨';
