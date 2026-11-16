import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetsListPage } from '../BudgetsListPage'
import { BudgetsService } from '../../../services/budgets.service'
import { useAuthStore } from '../../../stores/authStore'
import type { Budget } from '../../../types'

vi.mock('../../../services/budgets.service', () => ({
  BudgetsService: {
    createBudget: vi.fn(),
    listBudgets: vi.fn(),
    getBudgetDetails: vi.fn(),
    updateBudgetStatus: vi.fn(),
  },
}))

vi.mock('../../../lib/clinicService', () => ({
  clinicService: { getMyClinic: vi.fn(), getClinicByCode: vi.fn(), updateMyClinic: vi.fn() },
}))

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    clinicId: 'clinic-1',
    patientId: 'p1',
    tutorId: 't1',
    status: 'PENDING',
    discount: 0,
    totalAmount: 150,
    validUntil: '2026-03-01T12:00:00.000Z',
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    items: [],
    patient: { id: 'p1', name: 'Rex', species: 'CANINE', breed: null },
    tutor: { id: 't1', fullName: 'Maria Silva', phone: '61999990000', email: null, cpf: '52998224725' },
    ...overrides,
  } as Budget
}

describe('BudgetsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.com', name: 'Dr', role: 'OWNER', clinicId: 'clinic-1', createdAt: '', updatedAt: '' },
      isAuthenticated: true,
    })
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [makeBudget()], total: 1 })
  })

  it('lista paciente, tutor, total em R$ e status do orçamento', async () => {
    render(<BudgetsListPage />)

    expect(await screen.findByText('Rex')).toBeInTheDocument()
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument()
    expect(screen.getByTestId('budget-status-badge')).toHaveTextContent('Pendente')
    expect(screen.getByText('Exibindo de 1 a 1 de 1 resultados')).toBeInTheDocument()
  })

  it('envia o filtro de status ao servidor', async () => {
    const user = userEvent.setup()
    render(<BudgetsListPage />)
    await screen.findByText('Rex')

    await user.selectOptions(screen.getByLabelText('Filtrar por status'), 'APPROVED')

    await waitFor(() =>
      expect(BudgetsService.listBudgets).toHaveBeenLastCalledWith(
        'clinic-1',
        expect.objectContaining({ status: 'APPROVED', page: 1, limit: 10 }),
      ),
    )
  })

  it('envia a busca por paciente ou tutor depois do debounce, a partir de 2 caracteres', async () => {
    const user = userEvent.setup()
    render(<BudgetsListPage />)
    await screen.findByText('Rex')

    await user.type(screen.getByLabelText('Buscar por paciente ou tutor'), 'a')
    await user.type(screen.getByLabelText('Buscar por paciente ou tutor'), 'ria')

    await waitFor(
      () =>
        expect(BudgetsService.listBudgets).toHaveBeenLastCalledWith(
          'clinic-1',
          expect.objectContaining({ search: 'aria' }),
        ),
      { timeout: 2000 },
    )
  })

  it('converte o período em início e fim do dia local antes de enviar', async () => {
    render(<BudgetsListPage />)
    await screen.findByText('Rex')

    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-01-10' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-01-20' } })

    await waitFor(() =>
      expect(BudgetsService.listBudgets).toHaveBeenLastCalledWith(
        'clinic-1',
        expect.objectContaining({
          from: new Date('2026-01-10T00:00:00').toISOString(),
          to: new Date('2026-01-20T23:59:59.999').toISOString(),
        }),
      ),
    )
  })

  it('mostra o estado vazio quando não há orçamentos', async () => {
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [], total: 0 })
    render(<BudgetsListPage />)

    expect(await screen.findByText('Nenhum orçamento encontrado com os filtros atuais.')).toBeInTheDocument()
  })

  it('exige confirmação antes de aprovar pela ação rápida e aprova ao confirmar', async () => {
    const user = userEvent.setup()
    vi.mocked(BudgetsService.updateBudgetStatus).mockResolvedValue(makeBudget({ status: 'APPROVED' }))
    render(<BudgetsListPage />)
    await screen.findByText('Rex')

    await user.click(screen.getByRole('button', { name: /Aprovar/ }))
    expect(BudgetsService.updateBudgetStatus).not.toHaveBeenCalled()
    expect(screen.getByText('Aprovar este orçamento?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(BudgetsService.updateBudgetStatus).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Aprovar/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar aprovação' }))

    await waitFor(() =>
      expect(BudgetsService.updateBudgetStatus).toHaveBeenCalledWith('clinic-1', 'b1', 'APPROVED'),
    )
    expect(await screen.findByText('Status do orçamento atualizado.')).toBeInTheDocument()
  })

  it('ajusta a página para a última válida quando aprovar esvazia a página atual', async () => {
    const user = userEvent.setup()
    const page1Items = Array.from({ length: 10 }, (_, idx) =>
      makeBudget({ id: `b-${idx}`, patient: { id: `p-${idx}`, name: `Pet ${idx}`, species: 'CANINE', breed: null } }),
    )
    const page2Item = makeBudget({
      id: 'b-last',
      patient: { id: 'p-last', name: 'Luna', species: 'FELINE', breed: null },
    })

    vi.mocked(BudgetsService.listBudgets).mockImplementation(async (_clinicId, params) => {
      if (params?.page === 2) return { budgets: [page2Item], total: 11 }
      return { budgets: page1Items, total: 11 }
    })
    vi.mocked(BudgetsService.updateBudgetStatus).mockResolvedValue(makeBudget({ id: 'b-last', status: 'APPROVED' }))

    render(<BudgetsListPage />)
    await screen.findByText('Pet 0')

    await user.click(screen.getByRole('button', { name: '2' }))
    await screen.findByText('Luna')

    vi.mocked(BudgetsService.listBudgets).mockImplementation(async (_clinicId, params) => {
      if (params?.page === 2) return { budgets: [], total: 10 }
      return { budgets: page1Items, total: 10 }
    })

    await user.click(screen.getByRole('button', { name: /Aprovar/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar aprovação' }))

    expect(await screen.findByText('Pet 0')).toBeInTheDocument()
    expect(screen.getByText('Exibindo de 1 a 10 de 10 resultados')).toBeInTheDocument()
  })

  it('descarta resposta atrasada quando o filtro muda antes da primeira concluir', async () => {
    const user = userEvent.setup()
    let resolveFirst!: (value: { budgets: Budget[]; total: number }) => void
    const firstPromise = new Promise<{ budgets: Budget[]; total: number }>((resolve) => {
      resolveFirst = resolve
    })

    vi.mocked(BudgetsService.listBudgets)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce({
        budgets: [makeBudget({ id: 'b-new', patient: { id: 'p2', name: 'Thor', species: 'CANINE', breed: null } })],
        total: 1,
      })

    render(<BudgetsListPage />)
    await user.selectOptions(screen.getByLabelText('Filtrar por status'), 'APPROVED')

    expect(await screen.findByText('Thor')).toBeInTheDocument()

    resolveFirst({
      budgets: [makeBudget({ id: 'b-old', patient: { id: 'p1', name: 'Antigo', species: 'CANINE', breed: null } })],
      total: 1,
    })

    await waitFor(() => {
      expect(screen.queryByText('Antigo')).not.toBeInTheDocument()
      expect(screen.getByText('Thor')).toBeInTheDocument()
    })
  })

  it('mostra erro com nova tentativa quando a listagem falha', async () => {
    vi.mocked(BudgetsService.listBudgets).mockRejectedValueOnce(new Error('Servidor indisponível'))
    render(<BudgetsListPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
