import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VaccinationSection } from '../../../components/VaccinationSection'
import { VaccinationsService } from '../../../services/vaccinations.service'
import type { Vaccination } from '../../../types'

vi.mock('../../../services/vaccinations.service', () => ({
  VaccinationsService: {
    listByPatient: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

describe('VaccinationSection — Seção de Vacinação no Prontuário (CLI-06)', () => {
  const mockPatientId = 'patient-uuid-123'

  const mockVaccinations: Vaccination[] = [
    {
      id: 'vac-1',
      patientId: mockPatientId,
      vaccineName: 'V10 Múltipla',
      doseNumber: 1,
      intervalDays: 21,
      appliedAt: '2026-05-10T12:00:00.000Z',
      nextDoseAt: '2026-05-31T12:00:00.000Z',
      status: 'UP_TO_DATE',
      createdAt: '2026-05-10T12:00:00.000Z',
    },
    {
      id: 'vac-2',
      patientId: mockPatientId,
      vaccineName: 'Gripe Canina',
      doseNumber: 2,
      intervalDays: 30,
      appliedAt: '2026-06-01T12:00:00.000Z',
      nextDoseAt: '2026-07-01T12:00:00.000Z',
      status: 'PENDING',
      createdAt: '2026-06-01T12:00:00.000Z',
    },
    {
      id: 'vac-3',
      patientId: mockPatientId,
      vaccineName: 'Antirrábica Anual',
      doseNumber: null,
      intervalDays: null,
      appliedAt: '2025-01-10T12:00:00.000Z',
      nextDoseAt: '2026-01-10T12:00:00.000Z',
      status: 'OVERDUE',
      createdAt: '2025-01-10T12:00:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve exibir mensagem e spinner de carregamento enquanto busca dados da API', async () => {
    vi.mocked(VaccinationsService.listByPatient).mockReturnValue(new Promise(() => {}))

    render(<VaccinationSection patientId={mockPatientId} />)

    expect(screen.getByTestId('vaccinations-loading')).toBeInTheDocument()
    expect(screen.getByText(/Carregando cronograma de vacinação/i)).toBeInTheDocument()
  })

  it('deve exibir estado vazio com mensagem informativa quando o paciente não possui vacinas', async () => {
    vi.mocked(VaccinationsService.listByPatient).mockResolvedValue([])

    render(<VaccinationSection patientId={mockPatientId} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccinations-empty')).toBeInTheDocument()
    })

    expect(screen.getByText('Nenhuma vacina registrada')).toBeInTheDocument()
    expect(
      screen.getByText(/O paciente ainda não possui doses no histórico/i)
    ).toBeInTheDocument()
  })

  it('deve exibir mensagem de erro e permitir tentar novamente quando a API falhar', async () => {
    vi.mocked(VaccinationsService.listByPatient).mockRejectedValue(new Error('Falha de rede'))

    render(<VaccinationSection patientId={mockPatientId} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccinations-error')).toBeInTheDocument()
    })

    expect(screen.getByText('Falha de rede')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i })
    expect(retryBtn).toBeInTheDocument()

    // Testar retry
    vi.mocked(VaccinationsService.listByPatient).mockResolvedValue(mockVaccinations)
    await userEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('V10 Múltipla')).toBeInTheDocument()
    })
  })

  it('deve renderizar o cronograma completo com doses aplicadas, intervalo, próxima dose calculada e badges de status', async () => {
    vi.mocked(VaccinationsService.listByPatient).mockResolvedValue(mockVaccinations)

    render(<VaccinationSection patientId={mockPatientId} />)

    await waitFor(() => {
      expect(screen.getByText('V10 Múltipla')).toBeInTheDocument()
    })

    // Dose 1 com intervalo e próxima dose
    expect(screen.getByText('1ª dose')).toBeInTheDocument()
    expect(screen.getByText('21 dias')).toBeInTheDocument()
    expect(screen.getByTestId('badge-up-to-date')).toHaveTextContent('Em dia')

    // Dose 2 pendente
    expect(screen.getByText('Gripe Canina')).toBeInTheDocument()
    expect(screen.getByText('2ª dose')).toBeInTheDocument()
    expect(screen.getByText('30 dias')).toBeInTheDocument()
    expect(screen.getByTestId('badge-pending')).toHaveTextContent('Pendente')

    // Dose atrasada / Dose única
    expect(screen.getByText('Antirrábica Anual')).toBeInTheDocument()
    expect(screen.getByText('Dose única')).toBeInTheDocument()
    expect(screen.getByTestId('badge-overdue')).toHaveTextContent('Atrasada')
    const overdueRow = screen.getByTestId('vaccination-row-vac-3')
    expect(overdueRow).toHaveClass('vaccination-row-overdue')
    expect(screen.getByTestId('alert-icon-vac-3')).toBeInTheDocument()
  })

  it('deve abrir o modal de registro de vacina, preencher os campos e incluir nova vacina na lista', async () => {
    vi.mocked(VaccinationsService.listByPatient).mockResolvedValue([])
    const user = userEvent.setup()

    const createdVaccination: Vaccination = {
      id: 'new-vac-1',
      patientId: mockPatientId,
      vaccineName: 'Giárdia Vet',
      doseNumber: 1,
      intervalDays: 15,
      appliedAt: '2026-11-07T12:00:00.000Z',
      nextDoseAt: '2026-11-22T12:00:00.000Z',
      status: 'UP_TO_DATE',
      createdAt: '2026-11-07T12:00:00.000Z',
    }

    vi.mocked(VaccinationsService.create).mockResolvedValue(createdVaccination)

    render(<VaccinationSection patientId={mockPatientId} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccinations-empty')).toBeInTheDocument()
    })

    const openModalBtn = screen.getByRole('button', { name: /Registrar Vacina/i })
    await user.click(openModalBtn)

    // Modal aberto
    expect(screen.getByRole('heading', { name: /Registrar Vacinação/i })).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/Nome da Vacina \*/i)
    const doseInput = screen.getByLabelText(/Nº da Dose/i)
    const intervalInput = screen.getByLabelText(/Intervalo \(dias\)/i)
    const submitBtn = screen.getByRole('button', { name: /Salvar Vacina/i })

    await user.clear(nameInput)
    await user.type(nameInput, 'Giárdia Vet')

    await user.clear(doseInput)
    await user.type(doseInput, '1')

    await user.clear(intervalInput)
    await user.type(intervalInput, '15')

    await user.click(submitBtn)

    await waitFor(() => {
      expect(VaccinationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: mockPatientId,
          vaccineName: 'Giárdia Vet',
          doseNumber: 1,
          intervalDays: 15,
          status: 'UP_TO_DATE',
        })
      )
    })

    // Confere que a nova vacina foi inserida no cronograma em tela
    await waitFor(() => {
      expect(screen.getByText('Giárdia Vet')).toBeInTheDocument()
      expect(screen.getByText('15 dias')).toBeInTheDocument()
    })
  })

  it('deve registrar vacina com status PENDING informando data prevista (nextDoseAt)', async () => {
    vi.mocked(VaccinationsService.listByPatient).mockResolvedValue([])
    const user = userEvent.setup()

    const pendingVaccination: Vaccination = {
      id: 'pending-vac-1',
      patientId: mockPatientId,
      vaccineName: 'Raiva Agendada',
      doseNumber: 2,
      appliedAt: null,
      nextDoseAt: '2026-12-01T12:00:00.000Z',
      status: 'PENDING',
      createdAt: '2026-11-07T12:00:00.000Z',
    }

    vi.mocked(VaccinationsService.create).mockResolvedValue(pendingVaccination)

    render(<VaccinationSection patientId={mockPatientId} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccinations-empty')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Registrar Vacina/i }))

    await user.type(screen.getByLabelText(/Nome da Vacina \*/i), 'Raiva Agendada')

    // Troca status para PENDING
    await user.selectOptions(screen.getByLabelText(/Status da Vacina/i), 'PENDING')

    // Deve exibir o campo de Data Prevista
    const nextDoseInput = screen.getByLabelText(/Data Prevista \/ Próxima Dose \*/i)
    await user.type(nextDoseInput, '2026-12-01')

    await user.click(screen.getByRole('button', { name: /Salvar Vacina/i }))

    await waitFor(() => {
      expect(VaccinationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: mockPatientId,
          vaccineName: 'Raiva Agendada',
          status: 'PENDING',
          nextDoseAt: expect.stringContaining('2026-12-01'),
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Raiva Agendada')).toBeInTheDocument()
      expect(screen.getByTestId('badge-pending')).toBeInTheDocument()
    })
  })
})
