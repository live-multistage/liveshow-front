import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalyticsConsent, setAnalyticsConsent } from './consent';

describe('useAnalyticsConsent', () => {
  beforeEach(() => localStorage.clear());

  it('resolves a stored choice without ever reporting "no choice"', () => {
    localStorage.setItem('ls_analytics_consent', 'granted');

    const { result } = renderHook(() => useAnalyticsConsent());

    // Never null for a returning visitor — null would flash the consent
    // banner on every reload despite the stored decision.
    expect(result.current.consent).toBe('granted');
  });

  it('reports null (no choice) only after reading empty storage', () => {
    const { result } = renderHook(() => useAnalyticsConsent());

    expect(result.current.consent).toBeNull();
  });

  it('updates when consent is set', () => {
    const { result } = renderHook(() => useAnalyticsConsent());

    act(() => setAnalyticsConsent('denied'));

    expect(result.current.consent).toBe('denied');
    expect(localStorage.getItem('ls_analytics_consent')).toBe('denied');
  });
});
