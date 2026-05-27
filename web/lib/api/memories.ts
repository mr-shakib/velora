import { apiClient } from './client';

export const memoriesApi = {
  getAll: (params?: Record<string, unknown>) =>
    apiClient.get('/memories', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get(`/memories/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    apiClient.post('/memories', data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/memories/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/memories/${id}`).then((r) => r.data),

  getOnThisDay: () =>
    apiClient.get('/memories/on-this-day').then((r) => r.data),

  getAlbums: () =>
    apiClient.get('/memories/albums').then((r) => r.data),

  createAlbum: (data: { name: string; description?: string }) =>
    apiClient.post('/memories/albums', data).then((r) => r.data),

  getUploadSignature: (folderType: string) =>
    apiClient.post('/upload/signature', { folderType }).then((r) => r.data),
};
