import { apiRequest } from './client';

export const dashboardApi = {
  getLiveData: async (eventId) => {
    return await apiRequest(`/dashboard/events/${eventId}/live`);
  },

  getSummary: async (eventId) => {
    return await apiRequest(`/dashboard/events/${eventId}/summary`);
  },

  getAnalytics: async (eventId) => {
    return await apiRequest(`/dashboard/events/${eventId}/analytics`);
  },

  getGateAnalysis: async (eventId) => {
    return await apiRequest(`/dashboard/events/${eventId}/gates`);
  },

  getInsights: async (eventId) => {
    return await apiRequest(`/dashboard/events/${eventId}/insights`);
  },
};
