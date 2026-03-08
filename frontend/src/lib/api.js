import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scs_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('scs_token');
      localStorage.removeItem('scs_user');
      if (window.location.pathname.startsWith('/staff') && window.location.pathname !== '/staff/login') {
        window.location.href = '/staff/login';
      }
    }
    return Promise.reject(err);
  }
);

// Public
export const createLead = (data) => api.post('/leads', data);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/staff/me');
export const updateMe = (data) => api.put('/staff/me', data);

// Staff Leads
export const getLeads = (params) => api.get('/staff/leads', { params });
export const getLead = (id) => api.get(`/staff/leads/${id}`);
export const updateLead = (id, data) => api.put(`/staff/leads/${id}`, data);
export const addNote = (id, note) => api.post(`/staff/leads/${id}/notes`, { note });
export const deleteLead = (id) => api.delete(`/staff/leads/${id}`);
export const createManualLead = (data) => api.post('/staff/leads', data);
export const exportLeadsCSV = (params) => api.get('/staff/leads/export/csv', { params, responseType: 'blob' });

// Stats
export const getStats = () => api.get('/staff/stats');

// Staff Users
export const getUsers = () => api.get('/staff/users');
export const createUser = (data) => api.post('/staff/users', data);
export const updateUser = (id, data) => api.put(`/staff/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/staff/users/${id}`);

export default api;
