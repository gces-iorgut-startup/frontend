import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from '../SettingsPage'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../lib/authService'
import { clinicService } from '../../../lib/clinicService'

vi.mock('../../../lib/authService', () => ({
  authService: {
    getMe: vi.fn(),
    updateMe: vi.fn(),
  },
}))

vi.mock('../../../lib/clinicService', () => ({
  clinicService: {
    getMyClinic: vi.fn(),
    updateMyClinic: vi.fn(),
  },
}))

describe('SettingsPage — Formulários de Clínica e Perfil (CNPJ, Telefone, CRMV)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'owner-1',
        name: 'Dr. Roberto',
        email: 'roberto@iougurt.com',
        role: 'OWNER',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    vi.mocked(authService.getMe).mockResolvedValue({
      id: 'owner-1',
      name: 'Dr. Roberto',
      email: 'roberto@iougurt.com',
      role: 'OWNER',
      crmv: null,
      clinicId: 'clinic-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    vi.mocked(clinicService.getMyClinic).mockResolvedValue({
      id: 'clinic-1',
      name: 'Clínica Vet',
      cnpj: null,
      address: null,
      phone: null,
    })
  })

  it('deve aplicar máscaras de CNPJ e Telefone no formulário da clínica e bloquear CNPJ inválido', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SettingsPage />)

    const cnpjInput = (await screen.findByLabelText(/CNPJ/i)) as HTMLInputElement
    const phoneInput = screen.getByLabelText(/Telefone/i) as HTMLInputElement

    await user.type(cnpjInput, '11111111111111')
    expect(cnpjInput.value).toBe('11.111.111/1111-11')

    await user.type(phoneInput, '11999998888')
    expect(phoneInput.value).toBe('(11) 99999-8888')

    await user.click(screen.getByRole('button', { name: /Salvar clínica/i }))

    expect(await screen.findByText('CNPJ inválido.')).toBeInTheDocument()
    expect(clinicService.updateMyClinic).not.toHaveBeenCalled()
  })

  it('deve normalizar o CRMV ao perder o foco e validar formato ao salvar perfil', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SettingsPage />)

    const crmvInput = (await screen.findByLabelText(/CRMV/i)) as HTMLInputElement

    await user.type(crmvInput, 'sp12345')
    await user.tab()

    await waitFor(() => {
      expect(crmvInput.value).toBe('CRMV-SP 12345')
    })
  })
})
