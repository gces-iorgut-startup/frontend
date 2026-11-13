import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TutorPortalHomePage } from '../TutorPortalHomePage'
import { portalService } from '../../../lib/portalService'
import { useAuthStore } from '../../../stores/authStore'
import type { TutorDashboard, TutorAlert, TutorPortalPatientHistory } from '../../../types'

vi.mock('../../../lib/portalService', () => ({
  portalService: {
    getDashboard: vi.fn(),
    getAlerts: vi.fn(),
    getPatientHistory: vi.fn(),
    requestAppointment: vi.fn(),
  },
}))

describe('TutorPortalHomePage — Banner de Vacinação e Agendamento (EVO-06)', () => {
  const mockDashboard: TutorDashboard = {
    tutor: { id: 'tutor-1', fullName: 'Carlos Tutor', email: 'tutor@exemplo.com' },
    pets: [{ id: 'pet-1', name: 'Pipoca', species: 'CANINE', breed: 'Poodle' }],
    recentAppointments: [],
    upcomingVaccinations: [],
  }

  const mockHistory: TutorPortalPatientHistory = {
    patient: {
      id: 'pet-1',
      name: 'Pipoca',
      species: 'CANINE',
      tutorId: 'tutor-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    clinicalRecords: [],
    vaccinations: [],
    examFiles: [],
  }

  const mockAlerts: TutorAlert[] = [
    {
      type: 'overdue_vaccine',
      message: 'Vacina V10 de Pipoca atrasada',
      patientName: 'Pipoca',
      patientId: 'pet-1',
      vaccineName: 'V10 Plus',
      doseNumber: 1,
      date: '2026-11-01T12:00:00.000Z',
      daysDifference: 11,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        id: 'user-tutor-1',
        email: 'tutor@exemplo.com',
        name: 'Carlos Tutor',
        role: 'TUTOR',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      isAuthenticated: true,
    })
  })

  it('deve renderizar o banner de vacina atrasada no topo da tela do tutor e abrir o modal de agendamento', async () => {
    vi.mocked(portalService.getDashboard).mockResolvedValue(mockDashboard)
    vi.mocked(portalService.getAlerts).mockResolvedValue(mockAlerts)
    vi.mocked(portalService.getPatientHistory).mockResolvedValue(mockHistory)
    vi.mocked(portalService.requestAppointment).mockResolvedValue({} as never)

    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TutorPortalHomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('tutor-vaccine-alert-banner')).toBeInTheDocument()
    })

    expect(screen.getByText('Vacina Atrasada')).toBeInTheDocument()
    expect(screen.getByText('V10 Plus (Dose 1)')).toBeInTheDocument()

    // Clica no botão Solicitar Agendamento
    const requestBtn = screen.getByRole('button', { name: /Solicitar Agendamento/i })
    await user.click(requestBtn)

    // Modal de agendamento aberto com os dados preenchidos
    await waitFor(() => {
      expect(screen.getByTestId('request-appointment-modal')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Pipoca')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Vacinação')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Aplicação de vacina: V10 Plus')).toBeInTheDocument()
  })
})
