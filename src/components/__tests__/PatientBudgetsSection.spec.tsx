import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientBudgetsSection } from '../budgets/PatientBudgetsSection'
import { BudgetsService } from '../../services/budgets.service'
import { PatientsService } from '../../services/patients.service'
import { useAuthStore } from '../../stores/authStore'
import type { Budget } from '../../types'

vi.mock('../../services/budgets.service', () => ({
  BudgetsService: {
    createBudget: vi.fn(),
    listBudgets: vi.fn(),
    getBudgetDetails: vi.fn(),
    updateBudgetStatus: vi.fn(),
  },
}))

vi.mock('../../services/patients.service', () => ({
  PatientsService: { list: vi.fn(), getById: vi.fn() },
}))

const budget = {
  id: 'b1',
  clinicId: 'clinic-1',
  patientId: 'p1',
  tutorId: 't1',
  status: 'PENDING',
  discount: 0,
  totalAmount: 80,
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
  items: [],
} as unknown as Budget

describe('PatientBudgetsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.com', name: 'Dr', role: 'VET', clinicId: 'clinic-1', createdAt: '', updatedAt: '' },
      isAuthenticated: true,
    })
  })

  it('lista somente os orçamentos do paciente, filtrando pelo patientId', async () => {
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [budget], total: 1 })
    render(<PatientBudgetsSection patientId="p1" />)

    expect(await screen.findByText('R$ 80,00')).toBeInTheDocument()
    expect(BudgetsService.listBudgets).toHaveBeenCalledWith('clinic-1', { patientId: 'p1', limit: 50 })
  })

  it('mostra o estado vazio quando o paciente não tem orçamentos', async () => {
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [], total: 0 })
    render(<PatientBudgetsSection patientId="p1" />)

    expect(await screen.findByText('Nenhum orçamento para este paciente.')).toBeInTheDocument()
  })

  it('informa quando existem mais orçamentos além do limite exibido', async () => {
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [budget], total: 65 })
    render(<PatientBudgetsSection patientId="p1" />)

    expect(await screen.findByText('Exibindo os 1 orçamentos mais recentes de 65.')).toBeInTheDocument()
  })

  it('recarrega a lista depois de criar um orçamento', async () => {
    const user = userEvent.setup()
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [], total: 0 })
    render(<PatientBudgetsSection patientId="p1" />)
    await screen.findByText('Nenhum orçamento para este paciente.')

    vi.mocked(PatientsService.getById).mockResolvedValue({
      id: 'p1',
      name: 'Rex',
      species: 'CANINE',
      tutorId: 't1',
      createdAt: '',
      updatedAt: '',
      tutor: { id: 't1', fullName: 'Maria Silva' },
    } as never)

    await user.click(screen.getByRole('button', { name: /Novo Orçamento/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    vi.mocked(BudgetsService.createBudget).mockResolvedValue(budget)
    vi.mocked(BudgetsService.listBudgets).mockResolvedValue({ budgets: [budget], total: 1 })
    await user.type(await screen.findByLabelText('Descrição do item 1'), 'Consulta')
    await user.type(screen.getByLabelText('Valor unitário do item 1'), '80')
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    await waitFor(() => expect(BudgetsService.listBudgets).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('R$ 80,00')).toBeInTheDocument()
  })
})
