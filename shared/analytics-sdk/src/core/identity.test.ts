import { describe, it, expect } from 'vitest';
import { nextSession } from './identity';

describe('nextSession', () => {
  const min = 60_000;
  it('keeps session within 30 min', () => expect(nextSession({ id: 's', lastActivity: 0 }, 29 * min).id).toBe('s'));
  it('rotates after 30 min idle', () => expect(nextSession({ id: 's', lastActivity: 0 }, 31 * min).id).not.toBe('s'));
});
