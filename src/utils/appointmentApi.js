import api from './api';

const appointmentApi = {
  // Client
  book: (payload) => api.post('/appointments', payload),
  listMine: (status) => api.get(`/appointments/mine${status ? `?status=${status}` : ''}`),
  cancelMine: (id) => api.patch(`/appointments/${id}/cancel`),
  getQueuePosition: (id) => api.get(`/appointments/${id}/queue-position`),

  // Institution admin
  listForInstitution: ({ status, date } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (date) params.set('date', date);
    const qs = params.toString();
    return api.get(`/appointments/institution${qs ? `?${qs}` : ''}`);
  },
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
