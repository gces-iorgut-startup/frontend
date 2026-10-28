import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { useAuthStore } from '../../stores/authStore'
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

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown }

const originalAdapter = api.defaults.adapter

// Troca o transporte HTTP do axios: o interceptor roda de verdade e só a rede é simulada.
function mockServer(handler: Handler) {
  const calls: InternalAxiosRequestConfig[] = []
  api.defaults.adapter = async (config) => {
    calls.push(config)
    const { status, data } = handler(config)
    const response = { data, status, statusText: '', headers: {}, config }
    if (status >= 400) {
      throw new AxiosError('request failed', 'ERR_BAD_REQUEST', config, null, response)
    }
    return response
  }
  return calls
}

function mockRefresh(result: { csrfToken: string } | Error) {
  return vi.spyOn(axios, 'post').mockImplementation(async () => {
    if (result instanceof Error) throw result
    return { data: { user: mockUser, csrfToken: result.csrfToken } }
  })
}

describe('api (sessão por cookie + CSRF)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockUser, csrfToken: 'csrf-1', isAuthenticated: true })
  })

  afterEach(() => {
    api.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  describe('requisições', () => {
    it('envia cookies e identifica o cliente como web', async () => {
      const calls = mockServer(() => ({ status: 200, data: {} }))

      await api.get('/auth/me')

      expect(calls[0].withCredentials).toBe(true)
      expect(calls[0].headers.get('X-Client')).toBe('web')
    })

    it.each(['post', 'put', 'patch', 'delete'] as const)(
      'envia X-CSRF-Token em %s',
      async (method) => {
        const calls = mockServer(() => ({ status: 200, data: {} }))

        await api[method]('/patients')

        expect(calls[0].headers.get('X-CSRF-Token')).toBe('csrf-1')
      },
    )

    it('não envia X-CSRF-Token em GET', async () => {
      const calls = mockServer(() => ({ status: 200, data: {} }))

      await api.get('/patients')

      expect(calls[0].headers.get('X-CSRF-Token')).toBeFalsy()
    })

    it('nunca envia Authorization (o token fica no cookie HttpOnly)', async () => {
      const calls = mockServer(() => ({ status: 200, data: {} }))

      await api.post('/patients')

      expect(calls[0].headers.get('Authorization')).toBeFalsy()
    })

    it('não envia X-CSRF-Token quando ainda não há token', async () => {
      useAuthStore.setState({ csrfToken: null })
      const calls = mockServer(() => ({ status: 200, data: {} }))

      await api.post('/auth/login')

      expect(calls[0].headers.get('X-CSRF-Token')).toBeFalsy()
    })
  })

  describe('renovação automática em 401', () => {
    it('renova pelo cookie, atualiza o CSRF e refaz a requisição', async () => {
      let attempts = 0
      const calls = mockServer(() => (++attempts === 1 ? { status: 401 } : { status: 200, data: { ok: true } }))
      const refresh = mockRefresh({ csrfToken: 'csrf-2' })

      const response = await api.post('/patients')

      expect(response.data).toEqual({ ok: true })
      expect(refresh).toHaveBeenCalledTimes(1)
      const [url, body, config] = refresh.mock.calls[0]
      expect(url).toMatch(/\/auth\/refresh$/)
      expect(body).toEqual({})
      expect(config).toMatchObject({
        withCredentials: true,
        headers: { 'X-Client': 'web', 'X-CSRF-Token': 'csrf-1' },
      })
      expect(useAuthStore.getState().csrfToken).toBe('csrf-2')
      // a repetição usa o token CSRF novo
      expect(calls).toHaveLength(2)
      expect(calls[1].headers.get('X-CSRF-Token')).toBe('csrf-2')
    })

    it('várias requisições com 401 ao mesmo tempo disparam um único refresh', async () => {
      const failed = new Set<string>()
      mockServer((config) => {
        const key = config.url ?? ''
        if (!failed.has(key)) {
          failed.add(key)
          return { status: 401 }
        }
        return { status: 200, data: { url: key } }
      })
      const refresh = mockRefresh({ csrfToken: 'csrf-2' })

      const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')])

      expect(results.map((r) => r.data.url)).toEqual(['/a', '/b', '/c'])
      expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('encerra a sessão local quando o refresh falha', async () => {
      mockServer(() => ({ status: 401 }))
      const refreshError = new Error('refresh expirado')
      mockRefresh(refreshError)

      await expect(api.get('/patients')).rejects.toBe(refreshError)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.csrfToken).toBeNull()
    })

    it('não entra em loop se a requisição continua dando 401 depois do refresh', async () => {
      const calls = mockServer(() => ({ status: 401 }))
      const refresh = mockRefresh({ csrfToken: 'csrf-2' })

      await expect(api.get('/patients')).rejects.toMatchObject({ response: { status: 401 } })

      expect(refresh).toHaveBeenCalledTimes(1)
      expect(calls).toHaveLength(2)
    })

    it('não tenta renovar quando não há sessão (ex.: senha errada no login)', async () => {
      useAuthStore.setState({ user: null, csrfToken: null, isAuthenticated: false })
      mockServer(() => ({ status: 401 }))
      const refresh = mockRefresh({ csrfToken: 'x' })

      await expect(api.post('/auth/login')).rejects.toMatchObject({ response: { status: 401 } })

      expect(refresh).not.toHaveBeenCalled()
    })

    it('não renova em erros que não são 401', async () => {
      mockServer(() => ({ status: 403 }))
      const refresh = mockRefresh({ csrfToken: 'x' })

      await expect(api.post('/patients')).rejects.toMatchObject({ response: { status: 403 } })

      expect(refresh).not.toHaveBeenCalled()
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })
  })
})
