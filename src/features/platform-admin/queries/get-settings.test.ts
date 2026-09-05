import { describe, expect, it } from 'vitest';
import { isSettingsAuditEntry, lastFlagChange } from './get-settings';
import type { AuditLogEntry } from '../types/platform-admin.types';

function makeEntry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 'id',
    actorUserId: 'actor',
    actorName: 'Ysrael',
    action: 'FEATURE_FLAG_SET',
    targetType: 'feature_flag',
    targetId: null,
    targetLabel: null,
    metadata: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('lastFlagChange', () => {
  it('returns the newest entry matching targetId', () => {
    const older = makeEntry({ id: 'older', targetId: 'chat', createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeEntry({ id: 'newer', targetId: 'chat', createdAt: '2026-02-01T00:00:00.000Z' });
    const other = makeEntry({ id: 'other', targetId: 'two_factor', createdAt: '2026-03-01T00:00:00.000Z' });

    expect(lastFlagChange([older, newer, other], 'chat')).toEqual(newer);
  });

  it('falls back to targetLabel when targetId is not set', () => {
    const entry = makeEntry({ id: 'legacy', targetId: null, targetLabel: 'vod_upload' });

    expect(lastFlagChange([entry], 'vod_upload')).toEqual(entry);
  });

  it('returns undefined when no entry matches', () => {
    expect(lastFlagChange([], 'chat')).toBeUndefined();
  });
});

describe('isSettingsAuditEntry', () => {
  it('accepts FEATURE_FLAG_SET, FEE_RATE_SET and FEE_OVERRIDE_SET', () => {
    expect(isSettingsAuditEntry(makeEntry({ action: 'FEATURE_FLAG_SET' }))).toBe(true);
    expect(isSettingsAuditEntry(makeEntry({ action: 'FEE_RATE_SET' }))).toBe(true);
    expect(isSettingsAuditEntry(makeEntry({ action: 'FEE_OVERRIDE_SET' }))).toBe(true);
  });

  it('rejects unrelated actions', () => {
    expect(isSettingsAuditEntry(makeEntry({ action: 'ORG_APPROVED' }))).toBe(false);
  });
});
