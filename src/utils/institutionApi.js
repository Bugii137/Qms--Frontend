import api from './api';

const institutionApi = {
  listPublic: ({ search, category } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const qs = params.toString();
    return api.get(`/institutions${qs ? `?${qs}` : ''}`, { auth: false });
  },
  getPublicById: (id) => api.get(`/institutions/${id}`, { auth: false }),
  getMine: () => api.get('/institutions/me'),
  create: (payload) => api.post('/institutions', payload),
  updateMine: (payload) => api.put('/institutions/me', payload),

  // System admin
  listForSystemAdmin: (status) => api.get(`/institutions/admin/all${status ? `?status=${status}` : ''}`),
  setStatus: (id, status) => api.patch(`/institutions/admin/${id}/status`, { status }),
};

export default institutionApi;
