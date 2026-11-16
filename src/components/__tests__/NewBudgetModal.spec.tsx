import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewBudgetModal } from '../budgets/NewBudgetModal'
import { BudgetsService } from '../../services/budgets.service'
import { PatientsService } from '../../services/patients.service'
import { useAuthStore } from '../../stores/authStore'
import type { Patient } from '../../types'

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

const patient = {
  id: 'p1',
  name: 'Rex',
  species: 'CANINE',
  tutorId: 't1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  tutor: { id: 't1', fullName: 'Maria Silva' },
} as unknown as Patient

function renderModal(onSaved = vi.fn(), onClose = vi.fn()) {
  render(<NewBudgetModal defaultPatientId="p1" onClose={onClose} onSaved={onSaved} />)
  return { onSaved, onClose }
}

describe('NewBudgetModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.com', name: 'Dr', role: 'OWNER', clinicId: 'clinic-1', createdAt: '', updatedAt: '' },
      isAuthenticated: true,
    })
    vi.mocked(PatientsService.getById).mockResolvedValue(patient)
  })

  it('carrega o paciente e o tutor informados e adiciona ou remove linhas, sem remover a última', async () => {
    const user = userEvent.setup()
    renderModal()

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover item 1' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Adicionar item/ }))
    expect(screen.getByLabelText('Descrição do item 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remover item 2' }))
    expect(screen.queryByLabelText('Descrição do item 2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover item 1' })).toBeDisabled()
  })

  it('recalcula subtotal e total em tempo real ao mudar quantidade, valor e desconto em R$', async () => {
    const user = userEvent.setup()
    renderModal()
    await screen.findByText('Maria Silva')

    await user.clear(screen.getByLabelText('Quantidade do item 1'))
    await user.type(screen.getByLabelText('Quantidade do item 1'), '2')
    await user.type(screen.getByLabelText('Valor unitário do item 1'), '50')

    expect(screen.getByTestId('item-subtotal-1')).toHaveTextContent('100,00')
    expect(screen.getByTestId('budget-total')).toHaveTextContent('100,00')

    await user.type(screen.getByLabelText('Desconto'), '30')
    expect(screen.getByTestId('budget-discount')).toHaveTextContent('30,00')
    expect(screen.getByTestId('budget-total')).toHaveTextContent('70,00')
  })

  it('converte desconto percentual em R$ na prévia', async () => {
    const user = userEvent.setup()
    renderModal()
    await screen.findByText('Maria Silva')

    await user.clear(screen.getByLabelText('Quantidade do item 1'))
    await user.type(screen.getByLabelText('Quantidade do item 1'), '1')
    await user.type(screen.getByLabelText('Valor unitário do item 1'), '200')
    await user.selectOptions(screen.getByLabelText('Tipo de desconto'), 'PERCENT')
    await user.type(screen.getByLabelText('Desconto'), '12,5')

    expect(screen.getByTestId('budget-discount')).toHaveTextContent('25,00')
    expect(screen.getByTestId('budget-total')).toHaveTextContent('175,00')
  })

  it('bloqueia o envio quando o desconto excede o subtotal', async () => {
    const user = userEvent.setup()
    renderModal()
    await screen.findByText('Maria Silva')

    await user.type(screen.getByLabelText('Descrição do item 1'), 'Consulta')
    await user.type(screen.getByLabelText('Valor unitário do item 1'), '100')
    await user.type(screen.getByLabelText('Desconto'), '200')
    await user.click(screen.getByRole('button', { name: 'Salvar e enviar (Pendente)' }))

    expect(await screen.findByText(/maior que o subtotal/)).toBeInTheDocument()
    expect(BudgetsService.createBudget).not.toHaveBeenCalled()
  })

  it('envia o payload com desconto convertido em R$ e status Pendente', async () => {
    const user = userEvent.setup()
    const created = { id: 'b1' } as never
    vi.mocked(BudgetsService.createBudget).mockResolvedValue(created)
    const { onSaved } = renderModal()
    await screen.findByText('Maria Silva')

    await user.type(screen.getByLabelText('Descrição do item 1'), 'Vacina')
    await user.clear(screen.getByLabelText('Quantidade do item 1'))
    await user.type(screen.getByLabelText('Quantidade do item 1'), '2')
    await user.type(screen.getByLabelText('Valor unitário do item 1'), '50')
    await user.selectOptions(screen.getByLabelText('Tipo de desconto'), 'PERCENT')
    await user.type(screen.getByLabelText('Desconto'), '10')
    await user.click(screen.getByRole('button', { name: 'Salvar e enviar (Pendente)' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created))
    expect(BudgetsService.createBudget).toHaveBeenCalledWith(
      'clinic-1',
      expect.objectContaining({
        patientId: 'p1',
        tutorId: 't1',
        items: [{ description: 'Vacina', quantity: 2, unitPrice: 50 }],
        discount: 10,
        status: 'PENDING',
      }),
    )
  })

  it('mostra o erro do servidor em toast e não fecha o modal', async () => {
    const user = userEvent.setup()
    vi.mocked(BudgetsService.createBudget).mockRejectedValue(new Error('Falha no servidor'))
    const { onSaved, onClose } = renderModal()
    await screen.findByText('Maria Silva')

    await user.type(screen.getByLabelText('Descrição do item 1'), 'Vacina')
    await user.type(screen.getByLabelText('Valor unitário do item 1'), '50')
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no servidor')
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('fecha direto com Esc quando não há alterações e pede confirmação quando há rascunho digitado', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await screen.findByText('Maria Silva')

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    await user.type(screen.getByLabelText('Descrição do item 1'), 'Hemograma')
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText(/Descartar as alterações não salvas/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continuar editando' }))
    expect(onClose).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Descartar alterações' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
