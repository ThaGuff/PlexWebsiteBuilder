import axios, { type AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (error.response?.status === 429) {
      toast.error('Too many requests — please slow down.')
      return Promise.reject(error)
    }

    if (error.response?.status && error.response.status >= 500) {
      const msg = error.response.data?.message || 'Server error — please try again.'
      toast.error(msg)
    }

    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),
}

// ─── Build Jobs ────────────────────────────────────────────────────────────────
export const buildApi = {
  create: (data: Record<string, unknown>) =>
    api.post('/builds', data).then((r) => r.data),

  list: (page = 1, limit = 20) =>
    api.get('/builds', { params: { page, limit } }).then((r) => r.data),

  get: (id: string) =>
    api.get(`/builds/${id}`).then((r) => r.data),

  getStatus: (id: string) =>
    api.get(`/builds/${id}/status`).then((r) => r.data),

  cancel: (id: string) =>
    api.post(`/builds/${id}/cancel`).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/builds/${id}`).then((r) => r.data),

  scrapePreview: (url: string) =>
    api.post('/builds/scrape-preview', { url }).then((r) => r.data),

  download: (id: string) =>
    api.get(`/builds/${id}/download`, { responseType: 'blob' }).then((r) => r.data),
}

// ─── Sites ────────────────────────────────────────────────────────────────────
export const sitesApi = {
  list: () => api.get('/sites').then((r) => r.data),
  get: (id: string) => api.get(`/sites/${id}`).then((r) => r.data),
  delete: (id: string) => api.delete(`/sites/${id}`).then((r) => r.data),
  export: (id: string) => api.post(`/sites/${id}/export`).then((r) => r.data),
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
  recentBuilds: () => api.get('/dashboard/recent').then((r) => r.data),
}
