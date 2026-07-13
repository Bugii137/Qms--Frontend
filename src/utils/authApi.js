import api from './api';

const authApi = {
  register: (payload) => api.post('/auth/register', payload, { auth: false }),
  login: (payload) => api.post('/auth/login', payload, { auth: false }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, newPassword }, { auth: false }),
  me: () => api.get('/auth/me'),
  updateProfile: (payload) => api.put('/auth/me', payload),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export default authApi;
