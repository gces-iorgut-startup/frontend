import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../authStore'
import type { User } from '../../types'

const mockUser: User = {
  id: 'user-1',
  name: 'Dra. Ana',
  email: 'ana@iougurt.com',
  role: 'VET',
  clinicId: 'clinic-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useAuthStore (Zustand)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('deve iniciar desautenticado com user null', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('deve autenticar o usuário e persistir no localStorage via setAuth', () => {
    useAuthStore.getState().setAuth(mockUser)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockUser)

    const rawPersisted = localStorage.getItem('iougurt-auth')
    expect(rawPersisted).not.toBeNull()
    const persisted = JSON.parse(rawPersisted!)
    expect(persisted.state.isAuthenticated).toBe(true)
    expect(persisted.state.user.email).toBe('ana@iougurt.com')
  })

  it('deve limpar o estado e a persistência ao executar logout', () => {
    useAuthStore.getState().setAuth(mockUser)
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)

    const persisted = JSON.parse(localStorage.getItem('iougurt-auth')!)
    expect(persisted.state.user).toBeNull()
    expect(persisted.state.isAuthenticated).toBe(false)
  })
})

