import api from './apiService';

export const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response; // API interceptor already returns response.data
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response; // API interceptor already returns response.data
  },

  // Logout user
  logout: async (token) => {
    return await api.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Get user profile
  getProfile: async (token) => {
    return await api.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Update user profile
  updateProfile: async (profileData, token) => {
    return await api.put('/auth/profile', profileData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Change password
  changePassword: async (currentPassword, newPassword, token) => {
    return await api.put('/auth/password', {
      currentPassword,
      newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    return await api.post('/auth/forgot-password', { email });
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    return await api.post('/auth/reset-password', {
      token,
      password: newPassword
    });
  },

  // Verify if user is authenticated
  verifyAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      await api.get('/auth/profile');
      return true;
    } catch (error) {
      localStorage.removeItem('token');
      return false;
    }
  },
};