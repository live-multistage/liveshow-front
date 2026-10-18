import { describe, it, expect } from 'vitest';
import { activeMentionQuery, insertMention, mentionsUser, splitMentionSegments } from './mentions';

describe('activeMentionQuery', () => {
  it('opens on a bare @ and on a partial handle before the caret', () => {
    expect(activeMentionQuery('@', 1)).toEqual({ query: '', start: 0 });
    expect(activeMentionQuery('oi @Ma', 6)).toEqual({ query: 'ma', start: 3 });
  });

  it('stays closed inside an e-mail, after a space, or when the caret left the token', () => {
    expect(activeMentionQuery('joao@gm', 7)).toBeNull();
    expect(activeMentionQuery('@ana ', 5)).toBeNull();
    expect(activeMentionQuery('@ana oi', 7)).toBeNull();
  });

  it('works from a caret in the middle of the text', () => {
    expect(activeMentionQuery('oi @ma tudo', 6)).toEqual({ query: 'ma', start: 3 });
    expect(activeMentionQuery('oi @ma tudo', 3)).toBeNull();
  });
});

describe('insertMention', () => {
  it('replaces the partial token at the caret and adds one trailing space', () => {
    expect(insertMention('oi @ma', { query: 'ma', start: 3 }, 6, 'marina.v')).toEqual({
      value: 'oi @marina.v ',
      caret: 13,
    });
  });

  it('works mid-text and swallows the rest of the token and its space', () => {
    expect(insertMention('@ma tudo bem', { query: 'm', start: 0 }, 2, 'marina.v')).toEqual({
      value: '@marina.v tudo bem',
      caret: 10,
    });
  });
});

describe('splitMentionSegments', () => {
  const mentions = [{ userId: 'u-bia', username: 'bia' }];

  it('highlights only resolved mentions, case-insensitively', () => {
    expect(splitMentionSegments('oi @Bia e @zé', mentions)).toEqual([
      { kind: 'text', text: 'oi ' },
      { kind: 'mention', text: '@Bia', userId: 'u-bia' },
      { kind: 'text', text: ' e @zé' },
    ]);
  });

  it('keeps sentence punctuation out of the highlight and ignores e-mails', () => {
    expect(splitMentionSegments('valeu @bia.', mentions)).toEqual([
      { kind: 'text', text: 'valeu ' },
      { kind: 'mention', text: '@bia', userId: 'u-bia' },
      { kind: 'text', text: '.' },
    ]);
    expect(splitMentionSegments('x@bia', mentions)).toEqual([{ kind: 'text', text: 'x@bia' }]);
    expect(splitMentionSegments('joao@bia.com', mentions)).toEqual([{ kind: 'text', text: 'joao@bia.com' }]);
  });

  it('ignores runs longer than 30 chars and handles shorter than 3', () => {
    const long = 'a'.repeat(31);
    expect(splitMentionSegments(`@${long}`, [{ userId: 'u', username: long }])).toEqual([
      { kind: 'text', text: `@${long}` },
    ]);
    expect(splitMentionSegments('@ab', [{ userId: 'u', username: 'ab' }])).toEqual([{ kind: 'text', text: '@ab' }]);
  });

  it('returns the whole body as text when there are no mentions', () => {
    expect(splitMentionSegments('@bia', [])).toEqual([{ kind: 'text', text: '@bia' }]);
  });
});

describe('mentionsUser', () => {
  it('is true only for a mentioned, logged-in viewer', () => {
    expect(mentionsUser([{ userId: 'u1', username: 'a' }], 'u1')).toBe(true);
    expect(mentionsUser([{ userId: 'u1', username: 'a' }], null)).toBe(false);
    expect(mentionsUser([], 'u1')).toBe(false);
  });
});
