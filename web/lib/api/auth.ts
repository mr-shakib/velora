import { apiClient } from './client';

export const authApi = {
  register: (data: { email: string; password: string; displayName: string }) =>
    apiClient.post('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data).then((r) => r.data),

  verifyEmail: (data: { email: string; code: string }) =>
    apiClient.post('/auth/verify-email', data).then((r) => r.data),

  refresh: () =>
    apiClient.post('/auth/refresh').then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),

  resendOtp: (email: string) =>
    apiClient.post('/auth/resend-otp', { email }).then((r) => r.data),

  me: () =>
    apiClient.post('/auth/me').then((r) => r.data),
};
