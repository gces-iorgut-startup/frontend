import { api } from './api'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UpdateUserProfileRequest,
  User,
} from '../types'

interface GoogleAuthResponse extends AuthResponse {
  isNewUser: boolean
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  async register(data: RegisterRequest): Promise<{ user: AuthResponse['user'] }> {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  async refresh(): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/refresh', {})
    return response.data
  },

  async logout(): Promise<void> {
    await api.delete('/auth/logout')
  },

  async googleLogin(accessToken: string): Promise<GoogleAuthResponse> {
    const response = await api.post<GoogleAuthResponse>('/auth/google', { accessToken })
    return response.data
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me')
    return response.data.user
  },

  async updateMe(data: UpdateUserProfileRequest): Promise<User> {
    const response = await api.patch<{ user: User }>('/auth/me', data)
    return response.data.user
  },
}
