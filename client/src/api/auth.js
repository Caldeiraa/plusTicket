import { apiRequest, setAuthToken } from './client';

export const authApi = {
  login: async (credentials) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    const token = res.data?.accessToken || res.data?.token;
    if (token) {
      setAuthToken(token);
    }
    return res;
  },

  register: async (userData) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    const token = res.data?.accessToken || res.data?.token;
    if (token) {
      setAuthToken(token);
    }
    return res;
  },

  getProfile: async () => {
    return await apiRequest('/auth/me');
  },

  logout: () => {
    setAuthToken(null);
  },
};
