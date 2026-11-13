import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestAppointmentModal } from '../RequestAppointmentModal'
import { portalService } from '../../../lib/portalService'

vi.mock('../../../lib/portalService', () => ({
  portalService: {
    requestAppointment: vi.fn(),
  },
}))

describe('RequestAppointmentModal — Solicitação de Agendamento pelo Tutor (EVO-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não deve renderizar quando isOpen for false', () => {
    const { container } = render(
      <RequestAppointmentModal
        isOpen={false}
        patientId="pet-1"
        patientName="Pipoca"
        onClose={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('deve exibir os dados do pet, categoria Vacinação e observação pré-preenchida', () => {
    render(
      <RequestAppointmentModal
        isOpen={true}
        patientId="pet-1"
        patientName="Pipoca"
        vaccineName="V10"
        onClose={vi.fn()}
      />
    )

    expect(screen.getByTestId('request-appointment-modal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pipoca')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Vacinação')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Aplicação de vacina: V10')).toBeInTheDocument()
  })

  it('deve submeter a solicitação de agendamento com os dados preenchidos', async () => {
    vi.mocked(portalService.requestAppointment).mockResolvedValue({} as never)
    const user = userEvent.setup()
    const handleSuccess = vi.fn()

    render(
      <RequestAppointmentModal
        isOpen={true}
        patientId="pet-1"
        patientName="Pipoca"
        vaccineName="V10"
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /Solicitar Agendamento/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(portalService.requestAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'pet-1',
          category: 'VACCINATION',
          observation: 'Aplicação de vacina: V10',
        })
      )
    })

    expect(screen.getByTestId('request-success')).toBeInTheDocument()
  })

  it('deve exibir mensagem de erro quando a API falhar', async () => {
    vi.mocked(portalService.requestAppointment).mockRejectedValue(
      new Error('Horário indisponível.')
    )
    const user = userEvent.setup()

    render(
      <RequestAppointmentModal
        isOpen={true}
        patientId="pet-1"
        patientName="Pipoca"
        onClose={vi.fn()}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /Solicitar Agendamento/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByTestId('request-error')).toBeInTheDocument()
    })

    expect(screen.getByText('Horário indisponível.')).toBeInTheDocument()
  })
})
