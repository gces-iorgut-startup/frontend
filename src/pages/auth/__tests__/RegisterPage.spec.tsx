import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegisterPage } from '../RegisterPage'
import { authService } from '../../../lib/authService'

vi.mock('../../../lib/authService', () => ({
  authService: {
    register: vi.fn(),
    googleLogin: vi.fn(),
  },
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve cadastrar nova clínica/usuário e redirecionar para /login', async () => {
    vi.mocked(authService.register).mockResolvedValueOnce({
      user: {
        id: 'owner-1',
        name: 'Dra. Camila',
        email: 'camila@petlife.com',
        role: 'OWNER',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>Tela de Login</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dra. Camila' },
    })
    fireEvent.change(screen.getByLabelText(/Nome da clínica/i), {
      target: { value: 'Clínica PetLife' },
    })
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'camila@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaForte123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar conta/i }))

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        name: 'Dra. Camila',
        clinicName: 'Clínica PetLife',
        email: 'camila@petlife.com',
        password: 'SenhaForte123',
      })
      expect(screen.getByText('Tela de Login')).toBeInTheDocument()
    })
  })

  it('deve exibir erro caso o e-mail já esteja em uso', async () => {
    vi.mocked(authService.register).mockRejectedValueOnce(
      new Error('E-mail já cadastrado.'),
    )

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dra. Camila' },
    })
    fireEvent.change(screen.getByLabelText(/Nome da clínica/i), {
      target: { value: 'Clínica PetLife' },
    })
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'camila@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaForte123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar conta/i }))

    expect(await screen.findByText('E-mail já cadastrado.')).toBeInTheDocument()
  })
})
