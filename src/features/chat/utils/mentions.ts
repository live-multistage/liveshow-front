import type { ChatMention } from '@live-show/api-contracts';

export interface ActiveMention {
  query: string;
  start: number;
}

export type MentionSegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string; userId: string };

// "@…" right before the caret, not glued to a username char (no e-mails).
const ACTIVE_MENTION = /(?:^|[^a-z0-9._])@([a-z0-9._]{0,30})$/i;
// Same token rule the server uses (chat/domain/mentions.ts): the whole run, trailing '.' is punctuation, 3-30 chars.
const MENTION_TOKEN = /(?<![a-z0-9._])@([a-z0-9._]+)/gi;
const USERNAME_SHAPE = /^[a-z0-9._]{3,30}$/i;

// Works for any caret position: only the text before the caret is considered.
export function activeMentionQuery(value: string, caret: number): ActiveMention | null {
  const match = ACTIVE_MENTION.exec(value.slice(0, caret));
  if (!match) return null;
  return { query: match[1].toLowerCase(), start: caret - match[1].length - 1 };
}

export function insertMention(
  value: string,
  mention: ActiveMention,
  caret: number,
  username: string,
): { value: string; caret: number } {
  const inserted = `@${username} `;
  const rest = value.slice(caret).replace(/^[a-z0-9._]*/i, '').replace(/^ /, '');
  return { value: value.slice(0, mention.start) + inserted + rest, caret: mention.start + inserted.length };
}

export function splitMentionSegments(body: string, mentions: readonly ChatMention[]): MentionSegment[] {
  if (mentions.length === 0) return [{ kind: 'text', text: body }];
  const byUsername = new Map(mentions.map((m) => [m.username.toLowerCase(), m.userId]));
  const segments: MentionSegment[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const handle = match[1].replace(/\.+$/, '');
    if (!USERNAME_SHAPE.test(handle)) continue;
    const userId = byUsername.get(handle.toLowerCase());
    if (!userId || match.index === undefined) continue;
    const end = match.index + 1 + handle.length;
    if (match.index > last) segments.push({ kind: 'text', text: body.slice(last, match.index) });
    segments.push({ kind: 'mention', text: body.slice(match.index, end), userId });
    last = end;
  }
  if (last < body.length) segments.push({ kind: 'text', text: body.slice(last) });
  return segments;
}

export function mentionsUser(mentions: readonly ChatMention[], userId: string | null): boolean {
  return userId !== null && mentions.some((m) => m.userId === userId);
}
