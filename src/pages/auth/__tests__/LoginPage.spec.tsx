import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { authService } from '../../../lib/authService'
import { useAuthStore } from '../../../stores/authStore'

vi.mock('../../../lib/authService', () => ({
  authService: {
    login: vi.fn(),
    googleLogin: vi.fn(),
  },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('deve autenticar um veterinário e redirecionar para /home', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      user: {
        id: 'vet-1',
        name: 'Dr. Marcos',
        email: 'marcos@iougurt.com',
        role: 'VET',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      csrfToken: 'csrf-token',
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<div>Home da Clínica</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Usuário/i), {
      target: { value: 'marcos@iougurt.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaForte123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'marcos@iougurt.com',
        password: 'SenhaForte123!',
      })
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(screen.getByText('Home da Clínica')).toBeInTheDocument()
    })
  })

  it('deve exibir mensagem de erro quando as credenciais forem inválidas', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(
      new Error('E-mail ou senha incorretos.'),
    )

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Usuário/i), {
      target: { value: 'errado@iougurt.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('deve alternar a visibilidade da senha ao clicar no ícone de olho', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const passwordInput = screen.getByLabelText('Senha')
    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: /Mostrar senha/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
