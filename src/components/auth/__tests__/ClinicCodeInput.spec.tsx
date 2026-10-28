import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ClinicCodeInput } from '../ClinicCodeInput'
import { clinicService } from '../../../lib/clinicService'
import type { Clinic } from '../../../types'

vi.mock('../../../lib/clinicService', () => ({
  clinicService: {
    getClinicByCode: vi.fn(),
  },
}))

function TestWrapper({
  initialValue = '',
  onClinicResolved,
  disabled,
}: {
  initialValue?: string
  onClinicResolved?: (clinic: Clinic | null) => void
  disabled?: boolean
}) {
  const [code, setCode] = useState(initialValue)
  return (
    <ClinicCodeInput
      value={code}
      onChange={setCode}
      onClinicResolved={onClinicResolved}
      disabled={disabled}
    />
  )
}

describe('ClinicCodeInput — Validação em Tempo Real da Sigla da Clínica', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve converter automaticamente para maiúsculas e remover espaços', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })
    render(<TestWrapper />)

    const input = screen.getByTestId('clinic-code-input') as HTMLInputElement
    await user.type(input, 'pet life 123')

    expect(input.value).toBe('PETLIFE123')
  })

  it('não deve disparar busca se o código tiver menos de 3 caracteres', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })
    const resolvedMock = vi.fn()
    render(<TestWrapper onClinicResolved={resolvedMock} />)

    const input = screen.getByTestId('clinic-code-input')
    await user.type(input, 'PE')

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(clinicService.getClinicByCode).not.toHaveBeenCalled()
    expect(screen.queryByTestId('clinic-code-spinner')).not.toBeInTheDocument()
    expect(resolvedMock).toHaveBeenCalledWith(null)
  })

  it('deve validar com sucesso após debounce de 400ms e exibir o nome da clínica', async () => {
    const mockClinic: Clinic = {
      id: 'clinic-123',
      name: 'Clínica Veterinária PetLife',
      code: 'PETLIFE-7A2',
    }
    vi.mocked(clinicService.getClinicByCode).mockResolvedValue(mockClinic)

    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })
    const resolvedMock = vi.fn()

    render(<TestWrapper onClinicResolved={resolvedMock} />)

    const input = screen.getByTestId('clinic-code-input')
    await user.type(input, 'PETLIFE-7A2')

    // Antes do debounce resolver, deve exibir o spinner
    expect(screen.getByTestId('clinic-code-spinner')).toBeInTheDocument()

    // Avança o debounce dentro do act
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    await waitFor(() => {
      expect(clinicService.getClinicByCode).toHaveBeenCalledWith('PETLIFE-7A2')
    })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-success-msg')).toHaveTextContent('Clínica Veterinária PetLife')
      expect(screen.getByTestId('clinic-code-success-icon')).toBeInTheDocument()
    })

    expect(resolvedMock).toHaveBeenCalledWith(mockClinic)
  })

  it('deve exibir feedback de erro amigável quando a clínica não for encontrada (404)', async () => {
    const notFoundError = {
      response: {
        status: 404,
        data: { message: 'Clinic not found' },
      },
    }
    vi.mocked(clinicService.getClinicByCode).mockRejectedValue(notFoundError)

    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })
    const resolvedMock = vi.fn()

    render(<TestWrapper onClinicResolved={resolvedMock} />)

    const input = screen.getByTestId('clinic-code-input')
    await user.type(input, 'CODIGOINEXISTENTE')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    await waitFor(() => {
      expect(clinicService.getClinicByCode).toHaveBeenCalledWith('CODIGOINEXISTENTE')
    })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-error-msg')).toHaveTextContent(
        'Clínica não encontrada. Verifique a sigla com o responsável.',
      )
      expect(screen.getByTestId('clinic-code-error-icon')).toBeInTheDocument()
    })

    expect(resolvedMock).toHaveBeenCalledWith(null)
  })

  it('deve exibir feedback específico quando a clínica não tiver responsável ativo (400)', async () => {
    const inactiveError = {
      response: {
        status: 400,
        data: { message: 'Clinic has no active owner' },
      },
    }
    vi.mocked(clinicService.getClinicByCode).mockRejectedValue(inactiveError)

    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })
    const resolvedMock = vi.fn()

    render(<TestWrapper onClinicResolved={resolvedMock} />)

    const input = screen.getByTestId('clinic-code-input')
    await user.type(input, 'CLINICA-SEM-DONO')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    await waitFor(() => {
      expect(clinicService.getClinicByCode).toHaveBeenCalledWith('CLINICA-SEM-DONO')
    })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-error-msg')).toHaveTextContent(
        'Clínica não possui um responsável ativo no momento.',
      )
      expect(screen.getByTestId('clinic-code-error-icon')).toBeInTheDocument()
    })

    expect(resolvedMock).toHaveBeenCalledWith(null)
  })

  it('deve exibir feedback de formato inválido quando a API rejeitar a sigla (422)', async () => {
    const validationError = {
      response: {
        status: 422,
        data: { message: 'Validation error' },
      },
    }
    vi.mocked(clinicService.getClinicByCode).mockRejectedValue(validationError)

    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime })
    const resolvedMock = vi.fn()

    render(<TestWrapper onClinicResolved={resolvedMock} />)

    const input = screen.getByTestId('clinic-code-input')
    await user.type(input, 'SIGLA-MUITO-LONGA-DEMAIS')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-error-msg')).toHaveTextContent(
        'Formato de sigla inválido. Verifique a sigla com o responsável.',
      )
    })

    expect(resolvedMock).toHaveBeenCalledWith(null)
  })
})

