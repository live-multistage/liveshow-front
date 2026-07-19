import { httpClient } from '@/lib/http/client';
import type { AccessibilityStatus, CreateEventRequest, CreateTicketRequest, EventPhotoResponse, EventResponse, ListEventsFilter, PaginatedEventsResponse, RecommendedEventsResponse, TicketProductResponse, TicketProductsResponse, UpdateEventRequest, UpdateTicketRequest } from '../types/event.types';

export const eventsService = {
  listEvents: async (filter: ListEventsFilter = 'all', page = 1, pageSize = 50): Promise<PaginatedEventsResponse> => {
    const { data } = await httpClient.get<PaginatedEventsResponse>('/events', {
      params: { filter, page, pageSize },
    });
    return data;
  },

  getRecommendedEvents: async (): Promise<RecommendedEventsResponse> => {
    const { data } = await httpClient.get<RecommendedEventsResponse>('/events/recommended', {
      params: { page: 1, pageSize: 10 },
    });
    return data;
  },

  searchEvents: async (title: string, page = 1, pageSize = 20): Promise<PaginatedEventsResponse> => {
    const { data } = await httpClient.get<PaginatedEventsResponse>('/events/search', {
      params: { title, page, pageSize },
    });
    return data;
  },

  getMyEvents: async (): Promise<EventResponse[]> => {
    const { data } = await httpClient.get<EventResponse[]>('/events/mine');
    return data;
  },

  getEvent: async (id: string): Promise<EventResponse> => {
    const { data } = await httpClient.get<EventResponse>(`/events/${id}`);
    return data;
  },

  listTicketProducts: async (eventId: string): Promise<TicketProductsResponse> => {
    const { data } = await httpClient.get<TicketProductsResponse>(`/shows/${eventId}/tickets`);
    return data;
  },

  create: async (payload: CreateEventRequest): Promise<EventResponse> => {
    const { data } = await httpClient.post<EventResponse>('/events', payload);
    return data;
  },

  createTicket: async (eventId: string, payload: CreateTicketRequest): Promise<TicketProductResponse> => {
    const { data } = await httpClient.post<TicketProductResponse>(`/shows/${eventId}/tickets`, payload);
    return data;
  },

  // Toggle free access. Marking free removes any paid ticket products and
  // creates a single "Acesso Gratuito" product (backend enforces both).
  setFreeStatus: async (eventId: string, isFree: boolean): Promise<{ id: string; isFree: boolean }> => {
    const { data } = await httpClient.patch<{ id: string; isFree: boolean }>(`/shows/${eventId}/free-status`, { isFree });
    return data;
  },

  updateTicketProduct: async (eventId: string, ticketId: string, payload: UpdateTicketRequest): Promise<TicketProductResponse> => {
    const { data } = await httpClient.put<TicketProductResponse>(`/shows/${eventId}/tickets/${ticketId}`, payload);
    return data;
  },

  deleteTicketProduct: async (eventId: string, ticketId: string): Promise<void> => {
    await httpClient.delete(`/shows/${eventId}/tickets/${ticketId}`);
  },

  uploadAsset: async (eventId: string, assetType: 'banner' | 'thumbnail', file: File): Promise<EventResponse> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<EventResponse>(`/events/${eventId}/assets/${assetType}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadGalleryPhoto: async (eventId: string, file: File): Promise<EventPhotoResponse> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<EventPhotoResponse>(`/events/${eventId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  listPhotos: async (eventId: string): Promise<EventPhotoResponse[]> => {
    const { data } = await httpClient.get<EventPhotoResponse[]>(`/events/${eventId}/photos`);
    return data;
  },

  updateEvent: async (eventId: string, payload: UpdateEventRequest): Promise<EventResponse> => {
    const { data } = await httpClient.patch<EventResponse>(`/events/${eventId}`, payload);
    return data;
  },

  publishEvent: async (eventId: string): Promise<EventResponse> => {
    const { data } = await httpClient.patch<EventResponse>(`/events/${eventId}/publish`);
    return data;
  },

  unpublishEvent: async (eventId: string): Promise<EventResponse> => {
    const { data } = await httpClient.patch<EventResponse>(`/events/${eventId}/unpublish`);
    return data;
  },

  finishEvent: async (eventId: string): Promise<EventResponse> => {
    const { data } = await httpClient.patch<EventResponse>(`/events/${eventId}/finish`);
    return data;
  },

  // ── Accessibility (NBR 15290 — Libras window) ──────────────────
  getAccessibility: async (eventId: string): Promise<AccessibilityStatus> => {
    const { data } = await httpClient.get<AccessibilityStatus>(`/events/${eventId}/accessibility`);
    return data;
  },

  setLibrasCamera: async (eventId: string, cameraId: string): Promise<AccessibilityStatus> => {
    const { data } = await httpClient.patch<AccessibilityStatus>(`/events/${eventId}/libras-camera`, { cameraId });
    return data;
  },

  approveAccessibility: async (eventId: string): Promise<AccessibilityStatus> => {
    const { data } = await httpClient.post<AccessibilityStatus>(`/events/${eventId}/accessibility-approve`);
    return data;
  },
};
