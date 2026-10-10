import { describe, it, expect } from 'vitest';
import { omitRouteScopedMessages } from './client-messages';

describe('omitRouteScopedMessages', () => {
  it('drops route-scoped namespaces and keeps the rest', () => {
    const result = omitRouteScopedMessages({
      common: { loading: 'Carregando' },
      home: { headline: 'Shows' },
      platformAdmin: { title: 'Admin' },
      player: { play: 'Play' },
    });
    expect(Object.keys(result)).toEqual(['common', 'home']);
  });
});
