import axios from 'axios';
import { httpClient } from '@/lib/http/client';

export type VodAssetStatus = 'AWAITING_UPLOAD' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface VodAssetDto {
  id: string;
  eventId: string;
  status: VodAssetStatus;
  packageId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestVodUploadResponse {
  assetId: string;
  uploadUrl: string | null;
}

export async function requestVodUpload(eventId: string): Promise<RequestVodUploadResponse> {
  const { data } = await httpClient.post<RequestVodUploadResponse>(`/events/${eventId}/vod/upload`);
  return data;
}

// Local-driver fallback: multipart PUT through our own API when there's no presigned S3 url.
export async function uploadVodSourceDirect(eventId: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  await httpClient.put(`/events/${eventId}/vod/source`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) onProgress(e.loaded / e.total);
    },
  });
}

// Direct-to-S3 path: fetch() cannot report upload progress, so this uses a raw XHR PUT.
export function uploadVodSourceToS3(uploadUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'video/mp4');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Falha no upload para o storage (status ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Falha de rede no upload para o storage'));
    xhr.send(file);
  });
}

export async function completeVodUpload(eventId: string): Promise<VodAssetDto> {
  const { data } = await httpClient.post<VodAssetDto>(`/events/${eventId}/vod/complete`);
  return data;
}

export async function getVodAsset(eventId: string): Promise<VodAssetDto | null> {
  try {
    const { data } = await httpClient.get<VodAssetDto>(`/events/${eventId}/vod`);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}
