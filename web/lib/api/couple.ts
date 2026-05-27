import { apiClient } from './client';

export const coupleApi = {
  createInvite: () =>
    apiClient.post('/couple/invite').then((r) => r.data),

  getInvitePreview: (token: string) =>
    apiClient.get(`/couple/invite/${token}`).then((r) => r.data),

  acceptInvite: (token: string) =>
    apiClient.post(`/couple/accept/${token}`).then((r) => r.data),

  getMyCouple: () =>
    apiClient.get('/couple/me').then((r) => r.data),

  updateRelationshipStart: (date: string) =>
    apiClient.patch('/couple/relationship-start', { date }).then((r) => r.data),

  requestUnlink: () =>
    apiClient.post('/couple/unlink/request').then((r) => r.data),

  confirmUnlink: () =>
    apiClient.post('/couple/unlink/confirm').then((r) => r.data),

  cancelUnlink: () =>
    apiClient.post('/couple/unlink/cancel').then((r) => r.data),
};
