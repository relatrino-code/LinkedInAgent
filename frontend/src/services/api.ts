import axios from 'axios';
import type {
  UserProfile, SearchQuery, Job, Application,
  EmailThread, PaginatedResponse, DashboardStats,
} from '../types';

const api = axios.create({ baseURL: '/api' });

export const userApi = {
  getProfile: () => api.get<UserProfile>('/user/profile').then(r => r.data),
  createProfile: (data: Partial<UserProfile>) => api.post<UserProfile>('/user/profile', data).then(r => r.data),
  updateProfile: (data: Partial<UserProfile>) => api.put<UserProfile>('/user/profile', data).then(r => r.data),
  uploadResume: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/user/profile/resume', fd).then(r => r.data);
  },
  getSearchQueries: () => api.get<SearchQuery[]>('/user/search-queries').then(r => r.data),
  createSearchQuery: (data: Partial<SearchQuery>) => api.post<SearchQuery>('/user/search-queries', data).then(r => r.data),
  updateSearchQuery: (id: string, data: Partial<SearchQuery>) => api.put<SearchQuery>(`/user/search-queries/${id}`, data).then(r => r.data),
  deleteSearchQuery: (id: string) => api.delete(`/user/search-queries/${id}`).then(r => r.data),
};

export const jobsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Job>>('/jobs', { params }).then(r => r.data),
  get: (id: string) => api.get<Job>(`/jobs/${id}`).then(r => r.data),
  scrape: (params: { query: string; location?: string; companies?: string; experience_level?: string; keywords?: string; sources?: string }) =>
    api.post('/jobs/scrape', null, { params }).then(r => r.data),
  scrapeCareerPage: (url: string, company: string) =>
    api.post('/jobs/scrape-career-page', null, { params: { url, company } }).then(r => r.data),
  stats: () => api.get('/jobs/stats').then(r => r.data),
  scrapeStatus: (taskId: string) => api.get(`/jobs/scrape-status/${taskId}`).then(r => r.data),
};

export const applicationsApi = {
  list: (params?: Record<string, any>) =>
    api.get<PaginatedResponse<Application>>('/applications', { params }).then(r => r.data),
  get: (id: string) => api.get<Application>(`/applications/${id}`).then(r => r.data),
  create: (data: Partial<Application>) => api.post<Application>('/applications', data).then(r => r.data),
  update: (id: string, data: Partial<Application>) => api.put<Application>(`/applications/${id}`, data).then(r => r.data),
  findEmails: (id: string) => api.post(`/applications/${id}/find-emails`).then(r => r.data),
  sendEmail: (id: string, data: { subject: string; body: string }) =>
    api.post(`/applications/${id}/send-email`, data).then(r => r.data),
  getThreads: (id: string) => api.get<EmailThread[]>(`/applications/${id}/threads`).then(r => r.data),
  reply: (id: string, data: { thread_id: string; body: string }) =>
    api.post(`/applications/${id}/reply`, data).then(r => r.data),
  stats: () => api.get('/applications/stats').then(r => r.data),
};
