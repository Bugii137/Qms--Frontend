import api from './api';

const analyticsApi = {
  getSummary: () => api.get('/analytics/summary'),
  getAnalytics: () => api.get('/analytics'),
  getReport: (filters) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null)
    )
    return api.get(`/analytics/report?${params}`)
  },
};

export default analyticsApi;
