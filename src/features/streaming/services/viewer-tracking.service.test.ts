import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { viewerTrackingService } from './viewer-tracking.service';
import { httpClient } from '@/lib/http/client';

// Mock httpClient
vi.mock('@/lib/http/client', () => ({
  httpClient: {
    defaults: {
      baseURL: 'http://api.example.com',
    },
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('viewerTrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear token from localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('join', () => {
    it('sends sessionId, cameraId, visitId in the body', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      vi.mocked(httpClient.post).mockImplementation(mockPost);

      await viewerTrackingService.join('event123', 'session456', 'camera789', 'visit000');

      expect(mockPost).toHaveBeenCalledWith('/events/event123/viewers/join', {
        sessionId: 'session456',
        cameraId: 'camera789',
        visitId: 'visit000',
      });
    });

    it('does NOT send userId in the body', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      vi.mocked(httpClient.post).mockImplementation(mockPost);

      await viewerTrackingService.join('event123', 'session456', 'camera789', 'visit000');

      const body = mockPost.mock.calls[0][1];
      expect(body).not.toHaveProperty('userId');
    });

    it('silently ignores errors', async () => {
      const mockPost = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(httpClient.post).mockImplementation(mockPost);

      // Should not throw
      await viewerTrackingService.join('event123', 'session456', 'camera789', 'visit000');
    });
  });

  describe('heartbeat', () => {
    it('sends sessionId in the body', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      vi.mocked(httpClient.post).mockImplementation(mockPost);

      await viewerTrackingService.heartbeat('event123', 'session456');

      expect(mockPost).toHaveBeenCalledWith('/events/event123/viewers/heartbeat', {
        sessionId: 'session456',
      });
    });

    it('silently ignores errors', async () => {
      const mockPost = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(httpClient.post).mockImplementation(mockPost);

      // Should not throw
      await viewerTrackingService.heartbeat('event123', 'session456');
    });
  });

  describe('leave', () => {
    it('sends sessionId in the body', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      await viewerTrackingService.leave('event123', 'session456');

      const call = fetchSpy.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body).toEqual({ sessionId: 'session456' });
    });

    it('does NOT send userId in the body', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      await viewerTrackingService.leave('event123', 'session456');

      const call = fetchSpy.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body).not.toHaveProperty('userId');
    });

    it('includes Authorization header with stored token', async () => {
      localStorage.setItem('token', 'test-access-token');

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      await viewerTrackingService.leave('event123', 'session456');

      const call = fetchSpy.mock.calls[0];
      const headers = call[1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-access-token');
    });

    it('includes Authorization header with empty string if no token', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      await viewerTrackingService.leave('event123', 'session456');

      const call = fetchSpy.mock.calls[0];
      const headers = call[1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer ');
    });

    it('uses keepalive flag for unload safety', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      await viewerTrackingService.leave('event123', 'session456');

      const call = fetchSpy.mock.calls[0];
      expect((call[1] as RequestInit).keepalive).toBe(true);
    });

    it('silently ignores errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      // Should not throw
      await viewerTrackingService.leave('event123', 'session456');
    });
  });

  describe('getViewers', () => {
    it('returns current and total viewers', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        data: { currentViewers: 42, totalViews: 123 },
      });
      vi.mocked(httpClient.get).mockImplementation(mockGet);

      const result = await viewerTrackingService.getViewers('event123');

      expect(result).toEqual({ currentViewers: 42, totalViews: 123 });
      expect(mockGet).toHaveBeenCalledWith('/events/event123/viewers');
    });

    it('returns zeros on error', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(httpClient.get).mockImplementation(mockGet);

      const result = await viewerTrackingService.getViewers('event123');

      expect(result).toEqual({ currentViewers: 0, totalViews: 0 });
    });
  });
});
