import type { ChatMessage as ContractChatMessage } from '@live-show/api-contracts';

export type {
  ReactionEmoji,
  ChatMe,
  ChatRecentResponse,
  ChatStreamEvent,
} from '@live-show/api-contracts';
export { REACTION_EMOJIS, CHAT_ERROR_CODES } from '@live-show/api-contracts';

// Front-only decoration on top of the wire contract — avatar initials/color
// are derived client-side from `authorName`, never sent by the API.
export type ChatMessage = ContractChatMessage & {
  authorInitials: string;
  authorColor: string;
};
