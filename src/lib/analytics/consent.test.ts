import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalyticsConsent, setAnalyticsConsent } from './consent';

describe('useAnalyticsConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'ls_analytics_consent=; path=/; max-age=0';
  });

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

  it('mirrors the choice into a cookie the server can read', () => {
    act(() => setAnalyticsConsent('granted'));

    expect(document.cookie).toContain('ls_analytics_consent=granted');
  });

  it('backfills the cookie for a visitor who decided before it existed', () => {
    localStorage.setItem('ls_analytics_consent', 'denied');

    renderHook(() => useAnalyticsConsent());

    expect(document.cookie).toContain('ls_analytics_consent=denied');
  });
});
