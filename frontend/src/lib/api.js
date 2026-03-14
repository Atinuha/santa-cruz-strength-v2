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
export const verifyOtp = (email, otp) => api.post('/auth/verify-otp', { email, otp });
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });
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

// Invites
export const getInvites = () => api.get('/staff/invites');
export const createInvite = (data) => api.post('/staff/invites', data);
export const revokeInvite = (id) => api.delete(`/staff/invites/${id}`);
export const acceptInvite = (data) => api.post('/auth/accept-invite', data);

// Blog (Public)
export const getBlogPosts = (params) => api.get('/blog', { params });
export const getBlogPost = (slug) => api.get(`/blog/post/${slug}`);

// Blog (Staff)
export const getStaffBlogPosts = () => api.get('/staff/blog');
export const getStaffBlogPost = (id) => api.get(`/staff/blog/${id}`);
export const createBlogPost = (data) => api.post('/staff/blog', data);
export const updateBlogPost = (id, data) => api.put(`/staff/blog/${id}`, data);
export const deleteBlogPost = (id) => api.delete(`/staff/blog/${id}`);
export const getStaffedHours = () => api.get('/staff/settings/staffed-hours');
export const updateStaffedHours = (hours) => api.put('/staff/settings/staffed-hours', hours);

// CSV
export const importLeadsCSV = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/staff/leads/import/csv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const downloadCSVTemplate = () => api.get('/staff/leads/template/csv', { responseType: 'blob' });

export default api;
