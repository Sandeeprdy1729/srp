import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = response.data;
          useAuthStore.getState().setTokens(access_token, refresh_token);
          
          // Retry original request
          if (error.config && error.config.headers) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            return axios(error.config);
          }
        } catch {
          // Refresh failed, logout
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  
  register: (data: { email: string; password: string; full_name: string; phone?: string }) =>
    api.post('/auth/register', data),
  
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  
  logout: () => api.post('/auth/logout'),
  
  getMe: () => api.get('/auth/me'),
};

// Documents API
export const documentsApi = {
  list: (params?: { page?: number; page_size?: number; document_type?: string; search?: string }) =>
    api.get('/documents/', { params }),
  
  get: (id: string) => api.get(`/documents/${id}`),
  
  update: (id: string, data: { title?: string; document_type?: string }) =>
    api.put(`/documents/${id}`, data),
  
  delete: (id: string) => api.delete(`/documents/${id}`),
  
  getText: (id: string) => api.get(`/documents/${id}/text`),
  
  getInsights: (id: string) => api.get(`/documents/${id}/insights`),
  
  getTypes: () => api.get('/documents/types/list'),
};

// Upload API
export const uploadApi = {
  upload: (formData: FormData) =>
    api.post('/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  uploadBatch: (formData: FormData) =>
    api.post('/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Patients API
export const patientsApi = {
  list: () => api.get('/patients/'),
  
  get: (id: string) => api.get(`/patients/${id}`),
  
  create: (data: { display_name: string; date_of_birth?: string; gender?: string }) =>
    api.post('/patients/', data),
  
  update: (id: string, data: Partial<{ display_name: string; allergies: string[]; medical_conditions: string[] }>) =>
    api.put(`/patients/${id}`, data),
  
  delete: (id: string) => api.delete(`/patients/${id}`),
};

// Sharing API
export const sharingApi = {
  create: (data: { document_id: string; purpose?: string; expires_in_hours?: number }) =>
    api.post('/sharing/', data),
  
  list: () => api.get('/sharing/'),
  
  getByToken: (token: string) => api.get(`/sharing/${token}`),
  
  revoke: (id: string) => api.delete(`/sharing/${id}`),
};

// Family API
export const familyApi = {
  list: () => api.get('/family/'),
  
  add: (data: { member_email: string; patient_id: string; can_view?: boolean; can_upload?: boolean }) =>
    api.post('/family/', data),
  
  update: (id: string, data: { can_view?: boolean; can_upload?: boolean }) =>
    api.put(`/family/${id}`, data),
  
  remove: (id: string) => api.delete(`/family/${id}`),
  
  sharedWithMe: () => api.get('/family/shared-with-me'),
};

// Consent API
export const consentApi = {
  list: () => api.get('/consents/'),
  
  create: (data: { purpose: string; hi_types: string[] }) =>
    api.post('/consents/', data),
  
  grant: (id: string) => api.put(`/consents/${id}/grant`),
  
  deny: (id: string) => api.put(`/consents/${id}/deny`),
  
  revoke: (id: string) => api.put(`/consents/${id}/revoke`),
};

// AI API
export const aiApi = {
  translate: (data: { text: string; target_language: string; context?: object }) =>
    api.post('/ai/translate', data),
  
  analyze: (documentId: string) => api.post(`/ai/analyze?document_id=${documentId}`),
  
  correlate: (data: { patient_id: string; time_range_days?: number }) =>
    api.post('/ai/correlate', data),
  
  recommendations: (patientId: string) => api.get(`/ai/recommendations?patient_id=${patientId}`),
  
  healthSummary: (patientId: string) => api.get(`/ai/health-summary/${patientId}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  
  getHealthSummary: (patientId: string) => api.get(`/dashboard/health-summary?patient_id=${patientId}`),
  
  getTimeline: (patientId: string, days?: number) =>
    api.get(`/dashboard/timeline?patient_id=${patientId}&days=${days || 365}`),
  
  getEmergencyQR: () => api.get('/dashboard/emergency-qr'),
};
