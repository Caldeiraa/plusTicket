import { apiRequest } from './client';

export const checkInApi = {
  checkIn: async (checkInData) => {
    return await apiRequest('/checkin', {
      method: 'POST',
      body: JSON.stringify(checkInData),
    });
  },

  getEventCheckIns: async (eventId) => {
    return await apiRequest(`/checkin/events/${eventId}`);
  },
};
