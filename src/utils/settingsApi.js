import api from './api';

const settingsApi = {
  get: () => api.get('/admin/settings'),
  update: (payload) => api.put('/admin/settings', payload),
};

export default settingsApi;
