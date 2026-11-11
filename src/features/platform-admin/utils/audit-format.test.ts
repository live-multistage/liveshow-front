import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  auditActionLabel,
  auditChanges,
  auditFieldLabel,
  formatAuditValue,
} from './audit-format';

describe('auditActionLabel', () => {
  it.each([
    'ROLE_ASSIGNED', 'ROLE_REVOKED', 'ORG_MEMBER_ROLE_CHANGED', 'ORG_STATUS_SET', 'ORG_MEMBER_ADDED',
    'ORG_CREATED', 'ORG_FEATURE_FLAG_SET', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET',
    'ACCOUNT_DELETED', 'PROFILE_UPDATED', 'SESSION_REVOKED', 'SESSIONS_REVOKED_ALL', 'DATA_EXPORTED',
    'DATA_ERASURE_REQUESTED', 'CONSENT_CHANGED', 'ORGANIZER_APPLICATION_APPROVED',
    'ORGANIZER_APPLICATION_REJECTED', 'ARTIST_APPLICATION_APPROVED', 'ARTIST_APPLICATION_REJECTED',
  ])('has a PT-BR label for %s (not the raw code) and lists it in the filter', (action) => {
    expect(auditActionLabel(action)).not.toBe(action);
    expect(AUDIT_ACTIONS).toContain(action);
  });

  it('falls back to the raw code for unknown actions', () => {
    expect(auditActionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

describe('formatAuditValue', () => {
  it('renders empties, booleans and scalars in pt-BR', () => {
    expect(formatAuditValue(null)).toBe('—');
    expect(formatAuditValue(undefined)).toBe('—');
    expect(formatAuditValue(true)).toBe('sim');
    expect(formatAuditValue(false)).toBe('não');
    expect(formatAuditValue('ACTIVE')).toBe('ACTIVE');
    expect(formatAuditValue(12)).toBe('12');
  });

  it('serializes objects compactly', () => {
    expect(formatAuditValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe('auditChanges', () => {
  it('lists changed fields as de → para, skipping unchanged ones', () => {
    expect(auditChanges({ role: 'MEMBER', status: 'ACTIVE' }, { role: 'ADMIN', status: 'ACTIVE' })).toEqual([
      { kind: 'change', field: 'role', from: 'MEMBER', to: 'ADMIN' },
    ]);
  });

  it('treats a missing side as empty', () => {
    expect(auditChanges(null, { status: 'SUSPENDED' })).toEqual([{ kind: 'change', field: 'status', from: '—', to: 'SUSPENDED' }]);
    expect(auditChanges({ flag: true }, null)).toEqual([{ kind: 'change', field: 'flag', from: 'sim', to: '—' }]);
  });

  it('keeps de → para when before exists, even for arrays', () => {
    expect(auditChanges({ tags: ['a'] }, { tags: ['a', 'b'] })).toEqual([
      { kind: 'change', field: 'tags', from: 'a', to: 'a, b' },
    ]);
  });

  it('is empty when there is nothing to compare', () => {
    expect(auditChanges(null, null)).toEqual([]);
    expect(auditChanges(undefined, undefined)).toEqual([]);
  });

  it('keeps union order: before keys first, then new after keys', () => {
    expect(auditChanges({ a: 1 }, { b: 2 }).map((c) => c.field)).toEqual(['a', 'b']);
  });

  it('shows field names only for PROFILE_UPDATED-style after.fields lists', () => {
    expect(auditChanges(null, { fields: ['displayName', 'phone'] })).toEqual([
      { kind: 'list', field: 'fields', values: ['displayName', 'phone'] },
    ]);
  });
});

describe('auditFieldLabel', () => {
  it('translates known fields and passes unknown ones through', () => {
    expect(auditFieldLabel('role')).toBe('Papel');
    expect(auditFieldLabel('fields')).toBe('Campos alterados');
    expect(auditFieldLabel('weird_field')).toBe('weird_field');
  });
});
