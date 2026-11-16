import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { VaccinationAlertsWidget } from '../VaccinationAlertsWidget'
import { VaccinationAlertsService } from '../../services/vaccinationAlerts.service'
import { useAuthStore } from '../../stores/authStore'
import type { User } from '../../types'

vi.mock('../../services/vaccinationAlerts.service', () => ({
  VaccinationAlertsService: {
    listByClinic: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('VaccinationAlertsWidget — Resumo de Vacinas (EVO-06)', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'vet@exemplo.com',
    name: 'Dra. Ana',
    role: 'VET',
    clinicId: 'clinic-123',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: mockUser, isAuthenticated: true })
  })

  it('deve exibir carregamento e depois renderizar os contadores de vacinas atrasadas e a vencer', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 3,
      items: [
        {
          id: 'v1',
          vaccineName: 'V10',
          doseNumber: 1,
          nextDoseAt: '2026-11-01T00:00:00.000Z',
          status: 'OVERDUE',
          daysDifference: 10,
          daysOverdue: 10,
          patient: { id: 'p1', name: 'Rex', species: 'CANINE' },
          tutor: { id: 't1', fullName: 'Carlos', phone: '61999998888' },
        },
        {
          id: 'v2',
          vaccineName: 'Antirrábica',
          doseNumber: 1,
          nextDoseAt: '2026-11-05T00:00:00.000Z',
          status: 'OVERDUE',
          daysDifference: 6,
          daysOverdue: 6,
          patient: { id: 'p2', name: 'Thor', species: 'CANINE' },
          tutor: { id: 't2', fullName: 'Bruna', phone: '61988887777' },
        },
        {
          id: 'v3',
          vaccineName: 'Giárdia',
          doseNumber: 2,
          nextDoseAt: '2026-11-15T00:00:00.000Z',
          status: 'UPCOMING',
          daysDifference: 4,
          daysUntilDue: 4,
          patient: { id: 'p3', name: 'Mimi', species: 'FELINE' },
          tutor: { id: 't3', fullName: 'Lucas', phone: '61977776666' },
        },
      ],
    })

    render(
      <MemoryRouter>
        <VaccinationAlertsWidget days={7} />
      </MemoryRouter>
    )

    expect(screen.getByTestId('widget-loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('overdue-count')).toHaveTextContent('2')
      expect(screen.getByTestId('upcoming-count')).toHaveTextContent('1')
    })

    expect(VaccinationAlertsService.listByClinic).toHaveBeenCalledWith('clinic-123', { days: 7 })
  })

  it('deve navegar para a tela de alertas ao clicar no botão "Ver todos os alertas"', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 0,
      items: [],
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <VaccinationAlertsWidget />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('view-all-alerts-button')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('view-all-alerts-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/vacinas/alertas')
  })

  it('deve exibir mensagem amigável quando não houver nenhuma vacina pendente no período', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 0,
      items: [],
    })

    render(
      <MemoryRouter>
        <VaccinationAlertsWidget days={7} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('widget-empty-message')).toBeInTheDocument()
    })

    expect(screen.getByText(/Nenhuma vacina atrasada ou a vencer nos próximos 7 dias/i)).toBeInTheDocument()
  })

  it('deve exibir mensagem de erro amigável quando a consulta falhar', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockRejectedValue(new Error('Erro de conexão'))

    render(
      <MemoryRouter>
        <VaccinationAlertsWidget />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('widget-error')).toBeInTheDocument()
    })

    expect(screen.getByText('Erro de conexão')).toBeInTheDocument()
  })
})
