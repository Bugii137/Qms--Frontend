import api from './api';

const staffApi = {
  listByOwner: () => api.get('/staff'),
  create: (payload) => api.post('/staff', payload),
  update: (id, payload) => api.put(`/staff/${id}`, payload),
  setStatus: (id, status) => api.patch(`/staff/${id}/status`, { status }),
  remove: (id) => api.delete(`/staff/${id}`),
  getMine: () => api.get('/staff/me'),
};

export default staffApi;
