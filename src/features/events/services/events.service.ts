import { httpClient } from '@/lib/http/client';
import type { CreateEventRequest, CreateTicketRequest, EventPhotoResponse, EventResponse, ListEventsFilter, TicketProductResponse, UpdateEventRequest, UpdateTicketRequest } from '../types/event.types';

export const eventsService = {
  listEvents: async (filter: ListEventsFilter = 'all'): Promise<EventResponse[]> => {
    const { data } = await httpClient.get<EventResponse[]>('/events', { params: { filter } });
    return data;
  },

  searchEvents: async (title: string): Promise<EventResponse[]> => {
    const { data } = await httpClient.get<EventResponse[]>('/events/search', { params: { title } });
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

  listTicketProducts: async (eventId: string): Promise<TicketProductResponse[]> => {
    const { data } = await httpClient.get<TicketProductResponse[]>(`/shows/${eventId}/tickets`);
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
};
