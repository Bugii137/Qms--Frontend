import api from './api';

const institutionApi = {
  listPublic: async ({ search, category } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const qs = params.toString();
    const result = await api.get(`/institutions${qs ? `?${qs}` : ''}`, { auth: false });
    return {
      ...result,
      institutions: result.institutions.filter(institution => institution.status === 'active'),
    };
  },
  getPublicById: (id) => api.get(`/institutions/${id}`, { auth: false }),
  getMine: () => api.get('/institutions/me'),
  create: (payload) => api.post('/institutions', payload),
  updateMine: (payload) => api.put('/institutions/me', payload),

  // System admin
  listForSystemAdmin: (status) => api.get(`/institutions/admin/all${status ? `?status=${status}` : ''}`),
  createForSystemAdmin: (payload) => api.post('/institutions/admin', payload),
  updateForSystemAdmin: (id, payload) => api.put(`/institutions/admin/${id}`, payload),
  setStatus: (id, status) => api.patch(`/institutions/admin/${id}/status`, { status }),
  deleteForSystemAdmin: (id) => api.delete(`/institutions/admin/${id}`),
};

export default institutionApi;
