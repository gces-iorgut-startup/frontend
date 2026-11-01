import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ResetPasswordPage } from '../ResetPasswordPage'
import { api } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve manter o botão desabilitado enquanto a senha não cumprir os requisitos ou não coincidir', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/reset-password?token=tok-123']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )

    const submitBtn = screen.getByRole('button', { name: /Salvar senha/i })
    expect(submitBtn).toBeDisabled()

    await user.type(screen.getByLabelText('Nova senha'), 'Senha@123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'Outra@123')

    expect(screen.getByText(/Senhas não coincidem/i)).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()
  })

  it('deve redefinir a senha com sucesso quando os requisitos forem atendidos e redirecionar para /login', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })

    render(
      <MemoryRouter initialEntries={['/reset-password?token=tok-valid']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login Após Reset</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nova senha'), 'Forte@123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'Forte@123')

    const submitBtn = screen.getByRole('button', { name: /Salvar senha/i })
    expect(submitBtn).not.toBeDisabled()

    await user.click(submitBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/password/reset', {
        token: 'tok-valid',
        newPassword: 'Forte@123',
      })
      expect(screen.getByText('Login Após Reset')).toBeInTheDocument()
    })
  })
})

