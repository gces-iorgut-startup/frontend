import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// Por padrão usamos um caminho relativo (mesma origem que serviu o app),
// de modo que as chamadas passem pelo reverse proxy do nginx/Vite e nunca
// disparem CORS — funciona igual em dev local e em produção.
// Defina VITE_API_URL apenas se precisar apontar para uma API de outra origem.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

// A sessão vive em cookies HttpOnly (enviados via withCredentials). O header
// X-Client faz a API responder com cookies em vez de tokens no body.
const WEB_HEADERS = { 'X-Client': 'web' }
const UNSAFE_METHODS = ['post', 'put', 'patch', 'delete']

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    ...WEB_HEADERS,
  },
})

// ── Request Interceptor: attach CSRF token ───────
api.interceptors.request.use((config) => {
  const csrfToken = useAuthStore.getState().csrfToken
  if (csrfToken && UNSAFE_METHODS.includes((config.method ?? 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

// ── Response Interceptor: auto-refresh on 401 ────
let isRefreshing = false
let failedQueue: Array<{
  resolve: () => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh is done
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      if (!useAuthStore.getState().isAuthenticated) {
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        // O refresh token vai no cookie HttpOnly; o corpo é vazio.
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              ...WEB_HEADERS,
              'X-CSRF-Token': useAuthStore.getState().csrfToken ?? '',
            },
          },
        )

        const { user, csrfToken } = response.data
        useAuthStore.getState().setAuth(user, csrfToken)

        processQueue(null)

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
