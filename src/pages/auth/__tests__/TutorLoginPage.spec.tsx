import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TutorLoginPage } from '../TutorLoginPage'
import { authService } from '../../../lib/authService'
import { useAuthStore } from '../../../stores/authStore'

vi.mock('../../../lib/authService', () => ({
  authService: {
    login: vi.fn(),
  },
}))

describe('TutorLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('deve permitir login de usuário com role TUTOR e navegar para /portal', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      user: {
        id: 'tutor-1',
        name: 'Paulo Tutor',
        email: 'paulo@tutor.com',
        role: 'TUTOR',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      accessToken: 'token',
      refreshToken: 'refresh',
    })

    render(
      <MemoryRouter initialEntries={['/portal/login']}>
        <Routes>
          <Route path="/portal/login" element={<TutorLoginPage />} />
          <Route path="/portal" element={<div>Home do Portal do Tutor</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/E-mail/i), 'paulo@tutor.com')
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: /Entrar no portal/i }))

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(screen.getByText('Home do Portal do Tutor')).toBeInTheDocument()
    })
  })

  it('deve bloquear login na página do tutor se a conta pertencer à equipe da clínica (VET/OWNER)', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.login).mockResolvedValueOnce({
      user: {
        id: 'vet-1',
        name: 'Dra. Carla',
        email: 'carla@clinica.com',
        role: 'VET',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      accessToken: 'token',
      refreshToken: 'refresh',
    })

    render(
      <MemoryRouter>
        <TutorLoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/E-mail/i), 'carla@clinica.com')
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: /Entrar no portal/i }))

    expect(
      await screen.findByText(/Este acesso e exclusivo para tutores/i),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})

