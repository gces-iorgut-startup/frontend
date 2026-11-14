import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PatientDetailsPage } from '../PatientDetailsPage'
import { api } from '../../../lib/api'
import { clinicalService } from '../../../lib/clinicalService'
import { examService } from '../../../lib/examService'
import { AppointmentsService } from '../../../services/appointments.service'
import { BudgetsService } from '../../../services/budgets.service'

vi.mock('../../../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('../../../lib/clinicalService', () => ({
  clinicalService: { getPatientHistory: vi.fn() },
}))
vi.mock('../../../lib/examService', () => ({
  examService: { listPatientExams: vi.fn() },
}))
vi.mock('../../../services/appointments.service', () => ({
  AppointmentsService: { listByDay: vi.fn(), listInProgress: vi.fn(), create: vi.fn() },
}))
vi.mock('../../../services/budgets.service', () => ({
  BudgetsService: { createBudget: vi.fn(), listBudgets: vi.fn(), getBudgetDetails: vi.fn(), updateBudgetStatus: vi.fn() },
}))
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'vet-1' } }),
}))

describe('PatientDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(clinicalService.getPatientHistory).mockResolvedValue([])
    vi.mocked(examService.listPatientExams).mockResolvedValue([])
    vi.mocked(AppointmentsService.listByDay).mockResolvedValue([])
    vi.mocked(AppointmentsService.listInProgress).mockResolvedValue([])
  })

  it('exibe os contatos alternativos do tutor', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        patient: {
          id: 'patient-1',
          name: 'Luna',
          species: 'CANINE',
          tutor: {
            id: 'tutor-1',
            fullName: 'Mariana Costa',
            cpf: '52998224725',
            phone: '11988887777',
            alternateContacts: [
              {
                name: 'João Silva',
                phone: '61999991111',
                relationship: 'Cônjuge',
                hasWhatsApp: true,
              },
            ],
          },
        },
      },
    })

    render(
      <MemoryRouter initialEntries={['/pacientes/patient-1']}>
        <Routes>
          <Route path="/pacientes/:id" element={<PatientDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Contatos alternativos')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Cônjuge')).toBeInTheDocument()
    expect(screen.getByText('(61) 99999-1111')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp disponível')).toBeInTheDocument()
  })

  it('permite escolher o tipo antes de iniciar um atendimento imediato', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue({
      data: { patient: { id: 'patient-1', name: 'Luna', species: 'CANINE', tutor: null } },
    })
    vi.mocked(AppointmentsService.create).mockResolvedValue({ id: 'appointment-1' } as never)

    render(
      <MemoryRouter initialEntries={['/pacientes/patient-1']}>
        <Routes>
          <Route path="/pacientes/:id" element={<PatientDetailsPage />} />
          <Route path="/atendimentos/:appointmentId/pacientes/:patientId" element={<div>Atendimento iniciado</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Atender' }))
    await user.selectOptions(screen.getByLabelText('Tipo de atendimento'), 'RETURN')
    const attendButtons = screen.getAllByRole('button', { name: 'Atender' })
    const confirmButton = attendButtons[attendButtons.length - 1]
    expect(confirmButton).toBeDefined()
    await user.click(confirmButton!)

    expect(AppointmentsService.create).toHaveBeenCalledWith(expect.objectContaining({
      patientId: 'patient-1',
      category: 'RETURN',
    }))
    expect(await screen.findByText('Atendimento iniciado')).toBeInTheDocument()
  })

  it('abre a aba de orçamentos com a seção do paciente', async () => {
    const user = userEvent.setup()
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [], total: 0 })

    render(
      <MemoryRouter initialEntries={['/pacientes/patient-1']}>
        <Routes>
          <Route path="/pacientes/:id" element={<PatientDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Orçamentos' }))
    expect(await screen.findByLabelText('Orçamentos do paciente')).toBeInTheDocument()
  })
})
