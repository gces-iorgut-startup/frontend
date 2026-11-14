import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HospitalizationDashboard } from '../HospitalizationDashboard'
import { hospitalizationService } from '../../../lib/hospitalizationService'
import { useAuthStore } from '../../../stores/authStore'
import type { Hospitalization, User } from '../../../types'

vi.mock('../../../lib/hospitalizationService', () => ({
  hospitalizationService: {
    listActive: vi.fn(),
    admitPatient: vi.fn(),
  },
}))

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})

const mockedService = vi.mocked(hospitalizationService)

function hospitalizationFixture(overrides: Partial<Hospitalization> = {}): Hospitalization {
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
    ...overrides,
  }
}

// Sem valor default de propósito: `signIn(undefined)` cairia no default do
// parâmetro e a sessão continuaria com clínica, mascarando o teste da guarda.
function signIn(clinicId?: string) {
  const user = {
    id: 'vet-1',
    email: 'vet@iougurt.com',
    name: 'Dra. Vet',
    role: 'VET',
    clinicId,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  } as User

  useAuthStore.setState({ user, csrfToken: 'csrf', isAuthenticated: true })
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <HospitalizationDashboard />
    </MemoryRouter>
  )
}

describe('HospitalizationDashboard — cards de internação (EVO-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn('clinic-1')
  })

  it('busca as internações ativas da clínica da sessão', async () => {
    mockedService.listActive.mockResolvedValue([])

    renderDashboard()

    await waitFor(() => expect(mockedService.listActive).toHaveBeenCalledWith('clinic-1'))
  })

  it('renderiza o card com paciente, espécie, leito e motivo', async () => {
    mockedService.listActive.mockResolvedValue([hospitalizationFixture()])

    renderDashboard()

    expect(await screen.findByText('Rex')).toBeInTheDocument()
    expect(screen.getByText('Canino')).toBeInTheDocument()
    expect(screen.getByText('Baia 03')).toBeInTheDocument()
    expect(screen.getByText('Pós-operatório de castração')).toBeInTheDocument()
  })

  it('mostra o badge de internado', async () => {
    mockedService.listActive.mockResolvedValue([hospitalizationFixture()])

    renderDashboard()

    expect(await screen.findByTestId('hospitalization-status-admitted')).toHaveTextContent(
      'Internado'
    )
  })

  it('mostra o badge de crítico', async () => {
    mockedService.listActive.mockResolvedValue([
      hospitalizationFixture({ status: 'CRITICAL' }),
    ])

    renderDashboard()

    expect(await screen.findByTestId('hospitalization-status-critical')).toHaveTextContent(
      'Crítico'
    )
  })

  it('usa a inicial do paciente quando não há foto', async () => {
    mockedService.listActive.mockResolvedValue([hospitalizationFixture()])

    renderDashboard()

    await screen.findByText('Rex')
    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renderiza a foto do paciente quando existe', async () => {
    mockedService.listActive.mockResolvedValue([
      hospitalizationFixture({
        patient: {
          id: 'patient-1',
          name: 'Rex',
          species: 'CANINE',
          photoUrl: '/uploads/rex.png',
        },
      }),
    ])

    renderDashboard()

    const photo = await screen.findByRole('img', { name: 'Rex' })
    expect(photo).toHaveAttribute('src', expect.stringContaining('/uploads/rex.png'))
  })

  it('conta os leitos ocupados no cabeçalho, com plural correto', async () => {
    mockedService.listActive.mockResolvedValue([
      hospitalizationFixture(),
      hospitalizationFixture({ id: 'hosp-2', patientId: 'patient-2' }),
    ])

    renderDashboard()

    expect(await screen.findByText('2 leitos ocupados')).toBeInTheDocument()
  })

  it('usa singular para um único leito', async () => {
    mockedService.listActive.mockResolvedValue([hospitalizationFixture()])

    renderDashboard()

    expect(await screen.findByText('1 leito ocupado')).toBeInTheDocument()
  })

  it('mostra estado vazio sem nenhum internado', async () => {
    mockedService.listActive.mockResolvedValue([])

    renderDashboard()

    expect(
      await screen.findByText('Nenhum paciente internado neste momento.')
    ).toBeInTheDocument()
  })

  it('abre os detalhes ao clicar no card', async () => {
    const user = userEvent.setup()
    mockedService.listActive.mockResolvedValue([hospitalizationFixture()])

    renderDashboard()

    await user.click(await screen.findByRole('button', { name: /Rex/ }))

    expect(mockedNavigate).toHaveBeenCalledWith('/internacao/hosp-1')
  })

  it('mostra o erro quando a busca falha', async () => {
    // `getErrorMessage` devolve a mensagem do Error quando ela existe, então
    // usamos Error vazio para cair no texto padrão.
    mockedService.listActive.mockRejectedValue(new Error())

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as internações.'
    )
  })

  it('avisa quando a sessão não tem clínica, em vez de ficar em branco', async () => {
    signIn()
    mockedService.listActive.mockResolvedValue([])

    renderDashboard()

    expect(
      screen.getByText(/Não foi possível identificar a clínica da sua sessão/)
    ).toBeInTheDocument()
    expect(mockedService.listActive).not.toHaveBeenCalled()
  })

  it('mostra o tempo de internação a partir da entrada', async () => {
    mockedService.listActive.mockResolvedValue([hospitalizationFixture()])

    renderDashboard()

    await screen.findByText('Rex')
    // O valor exato depende do relógio; o que importa é não mostrar travessão.
    expect(screen.getByText('Internado há').nextElementSibling?.textContent).not.toBe('—')
  })

  it('não troca a tela por "Carregando" ao atualizar', async () => {
    const user = userEvent.setup()
    mockedService.listActive.mockResolvedValue([hospitalizationFixture()])

    renderDashboard()
    await screen.findByText('Rex')

    await user.click(screen.getByRole('button', { name: 'Atualizar painel' }))

    // O card continua montado durante a recarga: sem isso o scroll se perde e
    // a grade pisca a cada ação.
    expect(screen.getByText('Rex')).toBeInTheDocument()
  })
})
