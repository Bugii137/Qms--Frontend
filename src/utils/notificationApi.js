import api from './api';

const notificationApi = {
  listMine: (unreadOnly) => api.get(`/notifications${unreadOnly ? '?unread=true' : ''}`),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (preferences) => api.put('/notifications/preferences', preferences),
};

export default notificationApi;
