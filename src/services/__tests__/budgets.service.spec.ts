import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BudgetsService } from '../budgets.service'
import { api } from '../api'

vi.mock('../api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

describe('BudgetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createBudget envia o payload à rota da clínica e devolve o orçamento criado', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { budget: { id: 'b1' } } })
    const payload = {
      patientId: 'p1',
      tutorId: 't1',
      items: [{ description: 'Vacina', quantity: 1, unitPrice: 50 }],
      discount: 0,
      status: 'PENDING' as const,
    }

    const result = await BudgetsService.createBudget('clinic-1', payload)

    expect(api.post).toHaveBeenCalledWith('/clinics/clinic-1/budgets', payload)
    expect(result).toEqual({ id: 'b1' })
  })

  it('listBudgets repassa os filtros como query params e devolve a página', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { budgets: [], total: 0 } })

    const result = await BudgetsService.listBudgets('clinic-1', {
      status: 'PENDING',
      search: 'rex',
      page: 2,
      limit: 10,
    })

    expect(api.get).toHaveBeenCalledWith('/clinics/clinic-1/budgets', {
      params: { status: 'PENDING', search: 'rex', page: 2, limit: 10 },
    })
    expect(result).toEqual({ budgets: [], total: 0 })
  })

  it('getBudgetDetails consulta o orçamento pelo id dentro da clínica', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { budget: { id: 'b1', items: [] } } })

    const result = await BudgetsService.getBudgetDetails('clinic-1', 'b1')

    expect(api.get).toHaveBeenCalledWith('/clinics/clinic-1/budgets/b1')
    expect(result).toEqual({ id: 'b1', items: [] })
  })

  it('updateBudgetStatus envia PATCH com o novo status e devolve o orçamento atualizado', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { budget: { id: 'b1', status: 'APPROVED' } } })

    const result = await BudgetsService.updateBudgetStatus('clinic-1', 'b1', 'APPROVED')

    expect(api.patch).toHaveBeenCalledWith('/clinics/clinic-1/budgets/b1/status', { status: 'APPROVED' })
    expect(result).toEqual({ id: 'b1', status: 'APPROVED' })
  })
})
