import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ForgotPasswordPage } from '../ForgotPasswordPage'
import { api } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve enviar solicitação de recuperação de senha e exibir confirmação', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} })

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/E-mail/i), 'recuperar@iougurt.com')
    await user.click(screen.getByRole('button', { name: /Enviar email de recuperação/i }))

    expect(api.post).toHaveBeenCalledWith('/auth/password/forgot', {
      email: 'recuperar@iougurt.com',
    })
    expect(
      await screen.findByText(/você receberá um link para recuperar sua senha/i),
    ).toBeInTheDocument()
  })
})

