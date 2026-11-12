import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// Por padrão usamos um caminho relativo (mesma origem que serviu o app),
// de modo que as chamadas passem pelo reverse proxy do nginx/Vite e nunca
// disparem CORS — funciona igual em dev local e em produção.
// Defina VITE_API_URL apenas se precisar apontar para uma API de outra origem.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor: attach JWT ──────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response Interceptor: auto-refresh on 401 ────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Endpoints de autenticação devolvem 401 para credenciais inválidas; não
    // há sessão a renovar e tentar o refresh aqui mascararia o erro real.
    const isAuthEndpoint = /\/auth\/(login|register|refresh|google|first-access|set-password|reset-password|forgot-password)/.test(
      originalRequest?.url ?? '',
    )

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until refresh is done
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = useAuthStore.getState().refreshToken

      if (!refreshToken) {
        useAuthStore.getState().logout()
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } =
          response.data

        useAuthStore.getState().setAuth(user, newAccessToken, newRefreshToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        processQueue(null, newAccessToken)

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Só encerra a sessão se o servidor rejeitou o refresh token. Queda de
        // rede ou 5xx não devem deslogar o usuário.
        const status = (refreshError as { response?: { status?: number } })?.response?.status
        if (status === 400 || status === 401 || status === 403 || status === 404) {
          useAuthStore.getState().logout()
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
