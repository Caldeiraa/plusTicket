import { apiRequest } from './client';

export const eventsApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.city) query.append('city', params.city);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/events${queryString}`);
  },

  getById: async (id) => {
    return await apiRequest(`/events/${id}`);
  },

  getMyEvents: async () => {
    return await apiRequest('/events/my/events');
  },

  getStats: async (id) => {
    return await apiRequest(`/events/${id}/stats`);
  },

  create: async (eventData) => {
    return await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  update: async (id, eventData) => {
    return await apiRequest(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  publish: async (id) => {
    return await apiRequest(`/events/${id}/publish`, {
      method: 'POST',
    });
  },

  cancel: async (id) => {
    return await apiRequest(`/events/${id}`, {
      method: 'DELETE',
    });
  },
};
