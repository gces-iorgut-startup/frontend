import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetDetailsPrintModal } from '../budgets/BudgetDetailsPrintModal'
import { BudgetsService } from '../../services/budgets.service'
import { clinicService } from '../../lib/clinicService'
import { useAuthStore } from '../../stores/authStore'
import type { Budget, BudgetStatus } from '../../types'

vi.mock('../../services/budgets.service', () => ({
  BudgetsService: {
    createBudget: vi.fn(),
    listBudgets: vi.fn(),
    getBudgetDetails: vi.fn(),
    updateBudgetStatus: vi.fn(),
  },
}))

vi.mock('../../lib/clinicService', () => ({
  clinicService: { getMyClinic: vi.fn(), getClinicByCode: vi.fn(), updateMyClinic: vi.fn() },
}))

function makeBudget(status: BudgetStatus): Budget {
  return {
    id: 'b1234567-aaaa',
    clinicId: 'clinic-1',
    patientId: 'p1',
    tutorId: 't1',
    status,
    discount: 10,
    totalAmount: 90,
    notes: 'Pagamento em duas vezes',
    validUntil: '2026-03-01T12:00:00.000Z',
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    items: [{ id: 'i1', description: 'Vacina V10', quantity: 2, unitPrice: 50, subtotal: 100 }],
    patient: { id: 'p1', name: 'Rex', species: 'CANINE', breed: 'SRD' },
    tutor: { id: 't1', fullName: 'Maria Silva', phone: '61999990000', email: 'maria@x.com', cpf: '52998224725' },
  }
}

function renderModal(budget: Budget, onChanged = vi.fn()) {
  vi.mocked(BudgetsService.getBudgetDetails).mockResolvedValue(budget)
  vi.mocked(clinicService.getMyClinic).mockResolvedValue({
    id: 'clinic-1',
    name: 'Clínica Patas',
    phone: '6133334444',
    address: 'Rua A, 10',
    code: 'PATAS-01',
  } as never)
  render(<BudgetDetailsPrintModal budgetId={budget.id} onClose={vi.fn()} onChanged={onChanged} />)
  return { onChanged }
}

describe('BudgetDetailsPrintModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.com', name: 'Dr', role: 'VET', clinicId: 'clinic-1', createdAt: '', updatedAt: '' },
      isAuthenticated: true,
    })
  })

  it('exibe clínica, tutor, paciente com espécie traduzida, itens e totais do orçamento', async () => {
    const { unmount } = (() => {
      vi.mocked(BudgetsService.getBudgetDetails).mockResolvedValue(makeBudget('PENDING'))
      vi.mocked(clinicService.getMyClinic).mockResolvedValue({
        id: 'clinic-1',
        name: 'Clínica Patas',
        phone: '6133334444',
        address: 'Rua A, 10',
        code: 'PATAS-01',
      } as never)
      return render(<BudgetDetailsPrintModal budgetId="b1234567-aaaa" onClose={vi.fn()} />)
    })()

    expect(await screen.findByRole('heading', { name: 'Clínica Patas' })).toBeInTheDocument()
    expect(document.body).toHaveClass('budget-print-open')
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('CPF: 52998224725')).toBeInTheDocument()
    expect(screen.getByText('Rex')).toBeInTheDocument()
    expect(screen.getByText('Espécie: Canino')).toBeInTheDocument()
    expect(screen.getByText('Vacina V10')).toBeInTheDocument()
    expect(screen.getByTestId('print-total')).toHaveTextContent('90,00')
    expect(screen.getByText('Pagamento em duas vezes')).toBeInTheDocument()

    unmount()
    expect(document.body).not.toHaveClass('budget-print-open')
  })

  it('exige confirmação antes de aprovar ou recusar no modal', async () => {
    const user = userEvent.setup()
    const approved = { ...makeBudget('PENDING'), status: 'APPROVED' as const }
    vi.mocked(BudgetsService.updateBudgetStatus).mockResolvedValue(approved)
    const { onChanged } = renderModal(makeBudget('PENDING'))

    await user.click(await screen.findByRole('button', { name: 'Marcar como Aprovado' }))
    expect(BudgetsService.updateBudgetStatus).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(BudgetsService.updateBudgetStatus).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Marcar como Aprovado' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar aprovação' }))

    await waitFor(() =>
      expect(BudgetsService.updateBudgetStatus).toHaveBeenCalledWith('clinic-1', 'b1234567-aaaa', 'APPROVED'),
    )
    expect(onChanged).toHaveBeenCalledWith(approved)
    expect(await screen.findByText('Status do orçamento atualizado.')).toBeInTheDocument()
  })

  it('avisa quando getMyClinic falha sem engolir o erro', async () => {
    vi.mocked(BudgetsService.getBudgetDetails).mockResolvedValue(makeBudget('PENDING'))
    vi.mocked(clinicService.getMyClinic).mockRejectedValue(new Error('Falha clínica'))
    render(<BudgetDetailsPrintModal budgetId="b1234567-aaaa" onClose={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar os dados da clínica/)
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clínica' })).toBeInTheDocument()
  })

  it('não oferece ações de status para orçamento recusado', async () => {
    renderModal(makeBudget('REJECTED'))

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Marcar como/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/está bloqueado para alterações/)).not.toBeInTheDocument()
  })

  it('bloqueia alterações após aprovação e mostra o aviso', async () => {
    renderModal(makeBudget('APPROVED'))

    expect(await screen.findByText(/está bloqueado para alterações/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como Aprovado' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar como Recusado' })).not.toBeInTheDocument()
  })
})
