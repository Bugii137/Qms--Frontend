import api from './api';

const appointmentApi = {
  // Client
  book: (payload) => api.post('/appointments', payload),
  listMine: (status) => api.get(`/appointments/mine${status ? `?status=${status}` : ''}`),
  cancelMine: (id) => api.patch(`/appointments/${id}/cancel`),
  update: (id, payload) => api.put(`/appointments/${id}`, payload),
  remove: (id) => api.delete(`/appointments/${id}`),
  getQueuePosition: (id) => api.get(`/appointments/${id}/queue-position`),

  // Institution admin
  getInstitutionReport: (filters) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null)
    );
    return api.get(`/appointments/institution/report?${params}`);
  },
  listForInstitution: ({ status, date } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (date) params.set('date', date);
    const qs = params.toString();
    return api.get(`/appointments/institution${qs ? `?${qs}` : ''}`);
  },
  rebookForClient: (payload) => api.post('/appointments/institution/rebook', payload),
  getQueue: () => api.get('/appointments/institution/queue'),
  callNext: (id) => api.post(`/appointments/institution/queue/${id}/call-next`),
  assignStaff: (id, staffUserId) => api.patch(`/appointments/${id}/assign-staff`, { staffUserId }),

  // Staff
  listForStaff: ({ status, date } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (date) params.set('date', date);
    const qs = params.toString();
    return api.get(`/appointments/staff${qs ? `?${qs}` : ''}`);
  },

  // Shared
  setStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
};

export default appointmentApi;
