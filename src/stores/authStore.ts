import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

// Os tokens de sessão ficam em cookies HttpOnly, inacessíveis ao JavaScript.
// Aqui guardamos só o usuário e o token CSRF (que o navegador não envia
// sozinho e precisa ser reenviado no header X-CSRF-Token).
interface AuthState {
  user: User | null
  csrfToken: string | null
  isAuthenticated: boolean

  setAuth: (user: User, csrfToken: string) => void
  setCsrfToken: (csrfToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      csrfToken: null,
      isAuthenticated: false,

      setAuth: (user, csrfToken) =>
        set({
          user,
          csrfToken,
          isAuthenticated: true,
        }),

      setCsrfToken: (csrfToken) => set({ csrfToken }),

      logout: () =>
        set({
          user: null,
          csrfToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'iougurt-auth',
      version: 1,
      // v0 guardava accessToken/refreshToken no localStorage: descarta a sessão
      // antiga (o usuário precisa entrar de novo e o token sai do storage).
      migrate: () => ({ user: null, csrfToken: null, isAuthenticated: false }),
      partialize: (state) => ({
        user: state.user,
        csrfToken: state.csrfToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
