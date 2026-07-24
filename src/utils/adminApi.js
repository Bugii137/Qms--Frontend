import api from './api';

const adminApi = {
  listUsers: ({ search, role, isActive } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (isActive !== undefined) params.set('isActive', String(isActive));
    const qs = params.toString();
    return api.get(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  setUserActive: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }),
};

export default adminApi;
