import api from './api';

const analyticsApi = {
  getSummary: () => api.get('/analytics/summary'),
  getAnalytics: () => api.get('/analytics'),
};

export default analyticsApi;
