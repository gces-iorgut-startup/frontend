import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleLoginButton } from '../GoogleLoginButton'

let capturedOptions: {
  onSuccess?: (resp: { access_token: string }) => void
  onError?: () => void
} = {}

const mockTriggerLogin = vi.fn(() => {
  capturedOptions.onSuccess?.({ access_token: 'google-token-abc' })
})

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opts: typeof capturedOptions) => {
    capturedOptions = opts
    return mockTriggerLogin
  },
}))

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    capturedOptions = {}
    vi.clearAllMocks()
  })

  it('deve acionar o login do Google ao clicar e repassar o access_token no onSuccess', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    const onError = vi.fn()

    render(<GoogleLoginButton onSuccess={onSuccess} onError={onError} disabled={false} />)

    const button = screen.getByRole('button', { name: /Entrar com Google/i })
    await user.click(button)

    expect(mockTriggerLogin).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('google-token-abc')
  })

  it('deve respeitar a prop disabled', () => {
    render(<GoogleLoginButton onSuccess={vi.fn()} onError={vi.fn()} disabled={true} />)

    expect(screen.getByRole('button', { name: /Entrar com Google/i })).toBeDisabled()
  })
})

