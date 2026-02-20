import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies (refresh tokens) and credentials are sent for cross-origin requests
  withCredentials: true,
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, log out user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.pathname = '/journey/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (login: string, password: string) =>
    api.post('/auth/login', { login, password }),
  
  register: (token: string, username: string, password: string) =>
    api.post('/auth/register', { token, username, password }),
  registerRequest: (email: string, username: string, password: string) =>
    api.post('/auth/register/request', { email, username, password }),
  registerConfirm: (email: string, code: string) =>
    api.post('/auth/register/confirm', { email, code }),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, code, newPassword }),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// User API
export const userAPI = {
  updateProfile: (username: string) =>
    api.put('/user/profile', { username }),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/user/password', { currentPassword, newPassword }),
};

// Admin API
export const adminAPI = {
  getAllUsers: () =>
    api.get('/admin/users'),
  
  inviteUser: (email: string) =>
    api.post('/admin/invite', { email }),
  
  deleteUser: (userId: number) =>
    api.delete(`/admin/users/${userId}`),
  
  changeUserRole: (userId: number, role: 'admin' | 'user') =>
    api.put(`/admin/users/${userId}/role`, { role }),
  
  toggleUserActive: (userId: number) =>
    api.put(`/admin/users/${userId}/toggle-active`),
  
  getPendingInvitations: () =>
    api.get('/admin/invitations'),
  
  cancelInvitation: (invitationId: number) =>
    api.delete(`/admin/invitations/${invitationId}`),
  getRegistrationRequests: () =>
    api.get('/admin/registration_requests'),
  approveRegistrationRequest: (requestId: number) =>
    api.post(`/admin/registration_requests/${requestId}/approve`),
  rejectRegistrationRequest: (requestId: number) =>
    api.post(`/admin/registration_requests/${requestId}/reject`),
};

export default api;
