import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { VaccinationAlertsPage } from '../VaccinationAlertsPage'
import { VaccinationAlertsService } from '../../../services/vaccinationAlerts.service'
import { useAuthStore } from '../../../stores/authStore'
import type { User, VaccinationAlertItem } from '../../../types'

vi.mock('../../../services/vaccinationAlerts.service', () => ({
  VaccinationAlertsService: {
    listByClinic: vi.fn(),
  },
}))

interface MockScheduleModalProps {
  isOpen: boolean
  initialTutorId?: string
  initialPatientId?: string
  initialCategory?: string
  onClose: () => void
}

vi.mock('../../../components/scheduling/ScheduleModal', () => ({
  ScheduleModal: ({
    isOpen,
    initialTutorId,
    initialPatientId,
    initialCategory,
    onClose,
  }: MockScheduleModalProps) =>
    isOpen ? (
      <div data-testid="mock-schedule-modal">
        <span>Modal Aberto</span>
        <span>Tutor: {initialTutorId}</span>
        <span>Paciente: {initialPatientId}</span>
        <span>Categoria: {initialCategory}</span>
        <button onClick={onClose}>Fechar Modal</button>
      </div>
    ) : null,
}))

describe('VaccinationAlertsPage — Painel de Alertas de Vacinação (EVO-06)', () => {
  const mockUser: User = {
    id: 'user-vet-1',
    email: 'vet@exemplo.com',
    name: 'Dr. Roberto',
    role: 'VET',
    clinicId: 'clinic-xyz',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  }

  const mockAlerts: VaccinationAlertItem[] = [
    {
      id: 'alert-1',
      vaccineName: 'V10 Plus',
      doseNumber: 1,
      nextDoseAt: '2026-11-02T12:00:00.000Z',
      status: 'OVERDUE',
      daysDifference: 10,
      daysOverdue: 10,
      patient: { id: 'pet-1', name: 'Rex', species: 'CANINE' },
      tutor: { id: 'tutor-1', fullName: 'Carlos Silva', phone: '61999998888' },
    },
    {
      id: 'alert-2',
      vaccineName: 'Antirrábica',
      doseNumber: 1,
      nextDoseAt: '2026-11-20T12:00:00.000Z',
      status: 'UPCOMING',
      daysDifference: 8,
      daysUntilDue: 8,
      patient: { id: 'pet-2', name: 'Mimi', species: 'FELINE' },
      tutor: { id: 'tutor-2', fullName: 'Bruna Lima', phone: '61988887777' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: mockUser, isAuthenticated: true })
  })

  it('deve listar os alertas com dados do pet, tutor, vacina, data e status tags', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 2,
      items: mockAlerts,
    })

    render(
      <MemoryRouter>
        <VaccinationAlertsPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('alerts-loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Rex')).toBeInTheDocument()
      expect(screen.getByText('Mimi')).toBeInTheDocument()
    })

    // Checa nomes e vacinas
    expect(screen.getByText('V10 Plus')).toBeInTheDocument()
    expect(screen.getAllByText('1ª dose')).toHaveLength(2)
    expect(screen.getByText('Antirrábica')).toBeInTheDocument()

    // Checa tutores e telefones
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument()
    expect(screen.getByText('61999998888')).toBeInTheDocument()
    expect(screen.getByText('Bruna Lima')).toBeInTheDocument()

    // Checa badges
    expect(screen.getByTestId('badge-overdue')).toHaveTextContent('Atrasada')
    expect(screen.getByTestId('badge-upcoming')).toHaveTextContent('A Vencer')

    // Checa links de WhatsApp e telefone
    const whatsappLink = screen.getByTestId('whatsapp-link-alert-1')
    expect(whatsappLink).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/5561999998888')
    )

    const phoneLink = screen.getByTestId('phone-link-alert-1')
    expect(phoneLink).toHaveAttribute('href', 'tel:61999998888')
  })

  it('deve filtrar por status ao clicar nos botões de filtro', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 1,
      items: [mockAlerts[0]],
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <VaccinationAlertsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('filter-status-overdue')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('filter-status-overdue'))

    expect(VaccinationAlertsService.listByClinic).toHaveBeenCalledWith('clinic-xyz', {
      status: 'OVERDUE',
      days: 15,
    })
  })

  it('deve alterar o limiar de dias e recarregar os dados', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 2,
      items: mockAlerts,
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <VaccinationAlertsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('filter-days-select')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByTestId('filter-days-select'), '30')

    expect(VaccinationAlertsService.listByClinic).toHaveBeenCalledWith('clinic-xyz', {
      status: undefined,
      days: 30,
    })
  })

  it('deve filtrar os alertas em tempo real através do campo de busca', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 2,
      items: mockAlerts,
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <VaccinationAlertsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Rex')).toBeInTheDocument()
    })

    const searchInput = screen.getByTestId('search-alerts-input')
    await user.type(searchInput, 'Mimi')

    expect(screen.queryByText('Rex')).not.toBeInTheDocument()
    expect(screen.getByText('Mimi')).toBeInTheDocument()
  })

  it('deve exibir mensagem de empty state amigável quando não houver alertas', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 0,
      items: [],
    })

    render(
      <MemoryRouter>
        <VaccinationAlertsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('alerts-empty')).toBeInTheDocument()
    })

    expect(
      screen.getByText(/Nenhum alerta de vacinação pendente/i)
    ).toBeInTheDocument()
  })

  it('deve abrir o modal de agendamento ao clicar em "Agendar Aplicação"', async () => {
    vi.mocked(VaccinationAlertsService.listByClinic).mockResolvedValue({
      total: 1,
      items: [mockAlerts[0]],
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <VaccinationAlertsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('schedule-btn-alert-1')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('schedule-btn-alert-1'))

    expect(screen.getByTestId('mock-schedule-modal')).toBeInTheDocument()
    expect(screen.getByText('Tutor: tutor-1')).toBeInTheDocument()
    expect(screen.getByText('Paciente: pet-1')).toBeInTheDocument()
    expect(screen.getByText('Categoria: VACCINATION')).toBeInTheDocument()
  })
})
