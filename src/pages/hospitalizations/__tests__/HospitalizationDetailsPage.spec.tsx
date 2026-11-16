import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HospitalizationDetailsPage } from '../HospitalizationDetailsPage'
import { hospitalizationService } from '../../../lib/hospitalizationService'
import { useAuthStore } from '../../../stores/authStore'
import type { HospitalizationDetails, User } from '../../../types'

vi.mock('../../../lib/hospitalizationService', () => ({
  hospitalizationService: {
    getDetails: vi.fn(),
    updateStatus: vi.fn(),
    addEvolution: vi.fn(),
    discharge: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ id: 'hosp-1' }) }
})

const mockedService = vi.mocked(hospitalizationService)

function detailsFixture(overrides: Partial<HospitalizationDetails> = {}): HospitalizationDetails {
  return {
    id: 'hosp-1',
    clinicId: 'clinic-1',
    patientId: 'patient-1',
    admittedByVetId: 'vet-1',
    bedIdentifier: 'Baia 03',
    reason: 'Pós-operatório de castração',
    status: 'ADMITTED',
    admittedAt: '2026-11-13T08:00:00.000Z',
    dischargedAt: null,
    dischargeNotes: null,
    createdAt: '2026-11-13T08:00:00.000Z',
    updatedAt: '2026-11-13T08:00:00.000Z',
    patient: { id: 'patient-1', name: 'Rex', species: 'CANINE', photoUrl: null },
    admittedByVet: { id: 'vet-1', name: 'Dra. Vet' },
    evolutions: [],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <HospitalizationDetailsPage />
    </MemoryRouter>
  )
}

describe('HospitalizationDetailsPage (EVO-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        id: 'vet-1',
        email: 'vet@iougurt.com',
        name: 'Dra. Vet',
        role: 'VET',
        clinicId: 'clinic-1',
        createdAt: '2026-11-01T10:00:00.000Z',
        updatedAt: '2026-11-01T10:00:00.000Z',
      } as User,
      csrfToken: 'csrf',
      isAuthenticated: true,
    })
  })

  it('mostra o cabeçalho com paciente, espécie e leito', async () => {
    mockedService.getDetails.mockResolvedValue(detailsFixture())

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Rex' })).toBeInTheDocument()
    expect(screen.getByText(/Canino · Baia 03/)).toBeInTheDocument()
  })

  it('mostra a timeline com autor e sinais vitais', async () => {
    mockedService.getDetails.mockResolvedValue(
      detailsFixture({
        evolutions: [
          {
            id: 'evo-1',
            hospitalizationId: 'hosp-1',
            recordedByVetId: 'vet-1',
            temperature: 38.5,
            heartRate: 90,
            respiratoryRate: 24,
            mucousMembranes: 'Normocoradas',
            notes: 'Aceitou ração',
            recordedAt: '2026-11-13T10:00:00.000Z',
            recordedByVet: { id: 'vet-1', name: 'Dra. Vet' },
          },
        ],
      })
    )

    renderPage()

    expect(await screen.findByText('Aceitou ração')).toBeInTheDocument()
    expect(screen.getByText(/38\.5 °C · FC 90 bpm · FR 24 mpm · Normocoradas/)).toBeInTheDocument()
    expect(screen.getByText('Registrado por Dra. Vet')).toBeInTheDocument()
  })

  it('avisa quando a evolução não tem sinais vitais', async () => {
    mockedService.getDetails.mockResolvedValue(
      detailsFixture({
        evolutions: [
          {
            id: 'evo-1',
            hospitalizationId: 'hosp-1',
            recordedByVetId: 'vet-1',
            temperature: null,
            heartRate: null,
            respiratoryRate: null,
            mucousMembranes: null,
            notes: 'Medicação aplicada',
            recordedAt: '2026-11-13T10:00:00.000Z',
          },
        ],
      })
    )

    renderPage()

    expect(await screen.findByText('Sem sinais vitais aferidos')).toBeInTheDocument()
  })

  it('marca o paciente como crítico', async () => {
    const user = userEvent.setup()
    mockedService.getDetails.mockResolvedValue(detailsFixture())
    mockedService.updateStatus.mockResolvedValue(detailsFixture({ status: 'CRITICAL' }))

    renderPage()

    await user.click(await screen.findByRole('button', { name: /Marcar como crítico/ }))

    await waitFor(() =>
      expect(mockedService.updateStatus).toHaveBeenCalledWith('clinic-1', 'hosp-1', 'CRITICAL')
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Rex marcado como crítico')
  })

  it('volta o paciente crítico para estável', async () => {
    const user = userEvent.setup()
    mockedService.getDetails.mockResolvedValue(detailsFixture({ status: 'CRITICAL' }))
    mockedService.updateStatus.mockResolvedValue(detailsFixture())

    renderPage()

    await user.click(await screen.findByRole('button', { name: /Marcar como estável/ }))

    await waitFor(() =>
      expect(mockedService.updateStatus).toHaveBeenCalledWith('clinic-1', 'hosp-1', 'ADMITTED')
    )
  })

  it('mostra o badge de crítico', async () => {
    mockedService.getDetails.mockResolvedValue(detailsFixture({ status: 'CRITICAL' }))

    renderPage()

    expect(await screen.findByTestId('hospitalization-status-critical')).toHaveTextContent(
      'Crítico'
    )
  })

  it('leva a falha da troca de status para o toast', async () => {
    const user = userEvent.setup()
    mockedService.getDetails.mockResolvedValue(detailsFixture())
    // `getErrorMessage` devolve a mensagem do Error quando existe, então
    // usamos Error vazio para cair no texto padrão.
    mockedService.updateStatus.mockRejectedValue(new Error())

    renderPage()

    await user.click(await screen.findByRole('button', { name: /Marcar como crítico/ }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Não foi possível alterar o status.'
    )
  })

  it('esconde o formulário e as ações depois da alta', async () => {
    mockedService.getDetails.mockResolvedValue(
      detailsFixture({
        status: 'DISCHARGED',
        dischargedAt: '2026-11-13T18:00:00.000Z',
        dischargeNotes: 'Repouso por 7 dias',
      })
    )

    renderPage()

    await screen.findByRole('heading', { name: 'Rex' })
    expect(screen.queryByRole('button', { name: /Conceder alta médica/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Marcar como crítico/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Observações do plantão')).not.toBeInTheDocument()
    expect(screen.getByText('Repouso por 7 dias')).toBeInTheDocument()
  })

  it('mostra o erro quando a internação não carrega', async () => {
    mockedService.getDetails.mockRejectedValue(new Error())

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a internação.'
    )
  })
})
