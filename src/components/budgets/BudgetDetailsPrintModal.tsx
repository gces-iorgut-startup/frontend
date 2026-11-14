import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { BudgetsService } from '../../services/budgets.service'
import { clinicService } from '../../lib/clinicService'
import { getErrorMessage } from '../../lib/errorMessage'
import { formatCurrency } from '../../lib/currency'
import { isBudgetLocked } from '../../lib/budgetStatus'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../common/useToast'
import { Toast } from '../common/Toast'
import { BudgetStatusBadge } from './BudgetStatusBadge'
import {
  ConfirmBudgetStatusDialog,
  type ConfirmableBudgetStatus,
} from './ConfirmBudgetStatusDialog'
import { formatCivilDate } from '../chronicConditionDates'
import type { Budget, BudgetStatus, Clinic } from '../../types'
import '../../styles/budgets.css'

interface BudgetDetailsPrintModalProps {
  budgetId: string
  onClose: () => void
  onChanged?: (budget: Budget) => void
}

// Ações rápidas conforme a máquina de estados do backend.
const STATUS_ACTIONS: Record<BudgetStatus, { status: BudgetStatus; label: string }[]> = {
  DRAFT: [{ status: 'PENDING', label: 'Enviar como Pendente' }],
  PENDING: [
    { status: 'APPROVED', label: 'Marcar como Aprovado' },
    { status: 'REJECTED', label: 'Marcar como Recusado' },
  ],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
}

export function BudgetDetailsPrintModal({ budgetId, onClose, onChanged }: BudgetDetailsPrintModalProps) {
  const clinicId = useAuthStore((s) => s.user?.clinicId)
  const { toast, showToast } = useToast()
  const [budget, setBudget] = useState<Budget | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [clinicLoadFailed, setClinicLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ConfirmableBudgetStatus | null>(null)
  const requestSeqRef = useRef(0)

  const load = useCallback(async () => {
    const seq = ++requestSeqRef.current
    if (!clinicId) {
      setError('Clínica não identificada.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setClinicLoadFailed(false)
    try {
      const [detailsResult, clinicResult] = await Promise.allSettled([
        BudgetsService.getBudgetDetails(clinicId, budgetId),
        clinicService.getMyClinic(),
      ])
      if (seq !== requestSeqRef.current) return
      if (detailsResult.status === 'rejected') {
        setError(getErrorMessage(detailsResult.reason, 'Não foi possível carregar o orçamento.'))
        return
      }
      setBudget(detailsResult.value)
      if (clinicResult.status === 'fulfilled') {
        setClinic(clinicResult.value)
        setClinicLoadFailed(false)
      } else {
        setClinic(null)
        setClinicLoadFailed(true)
      }
    } finally {
      if (seq === requestSeqRef.current) setLoading(false)
    }
  }, [budgetId, clinicId])

  useEffect(() => {
    void load()
    return () => {
      requestSeqRef.current += 1
    }
  }, [load])

  useEffect(() => {
    document.body.classList.add('budget-print-open')
    return () => {
      document.body.classList.remove('budget-print-open')
    }
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingStatus && !updating) onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, pendingStatus, updating])

  const changeStatus = async (status: BudgetStatus) => {
    if (!clinicId || !budget) return
    setUpdating(true)
    try {
      const updated = await BudgetsService.updateBudgetStatus(clinicId, budget.id, status)
      setBudget(updated)
      onChanged?.(updated)
      showToast('Status do orçamento atualizado.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível atualizar o status.'), 'error')
    } finally {
      setPendingStatus(null)
      setUpdating(false)
    }
  }

  const content = (
    <div className="budget-print-overlay" role="presentation">
      <div className="budget-modal budget-print-modal" role="dialog" aria-modal="true" aria-label="Orçamento">
        <header className="budget-modal-header no-print">
          <h2>Orçamento</h2>
          <div className="budget-modal-header-actions">
            <button type="button" className="budget-button" onClick={() => window.print()} disabled={!budget}>
              <Printer size={16} /> Imprimir / Salvar PDF
            </button>
            <button type="button" className="budget-icon-button" aria-label="Fechar" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        {loading && <p className="budget-hint no-print">Carregando orçamento...</p>}
        {error && <p className="budget-error no-print" role="alert">{error}</p>}
        {clinicLoadFailed && !error && (
          <div className="budget-error-box no-print" role="alert">
            <p>Não foi possível carregar os dados da clínica para o cabeçalho. A impressão usará o cabeçalho padrão.</p>
            <button type="button" className="budget-link-button" onClick={() => void load()}>
              Tentar novamente
            </button>
          </div>
        )}

        {budget && (
          <article className="budget-print-sheet">
            <header className="budget-print-header">
              <div>
                <h1>{clinic?.name ?? 'Clínica'}</h1>
                {clinic?.phone && <p>Telefone: {clinic.phone}</p>}
                {clinic?.address && <p>{clinic.address}</p>}
                {clinic?.code && <p>Código: {clinic.code}</p>}
              </div>
              <div className="budget-print-meta">
                <p>
                  <strong>Orçamento</strong> #{budget.id.slice(0, 8).toUpperCase()}
                </p>
                <p>Emissão: {new Date(budget.createdAt).toLocaleDateString('pt-BR')}</p>
                <p>Validade: {formatCivilDate(budget.validUntil)}</p>
                <BudgetStatusBadge status={budget.status} />
              </div>
            </header>

            <section className="budget-print-parties">
              <div>
                <h3>Tutor</h3>
                <p>{budget.tutor?.fullName ?? '—'}</p>
                {budget.tutor?.cpf && <p>CPF: {budget.tutor.cpf}</p>}
                {budget.tutor?.phone && <p>Telefone: {budget.tutor.phone}</p>}
                {budget.tutor?.email && <p>E-mail: {budget.tutor.email}</p>}
              </div>
              <div>
                <h3>Paciente</h3>
                <p>{budget.patient?.name ?? '—'}</p>
                {budget.patient?.species && <p>Espécie: {getPatientSpeciesLabel(budget.patient.species)}</p>}
                {budget.patient?.breed && <p>Raça: {budget.patient.breed}</p>}
              </div>
            </section>

            <table className="budget-print-items">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Qtd.</th>
                  <th>Valor unitário</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {budget.items.map((item, index) => (
                  <tr key={item.id ?? index}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="budget-print-totals">
              <div>
                <dt>Desconto</dt>
                <dd>{formatCurrency(budget.discount)}</dd>
              </div>
              <div className="budget-totals-final">
                <dt>Valor total</dt>
                <dd data-testid="print-total">{formatCurrency(budget.totalAmount)}</dd>
              </div>
            </dl>

            {budget.notes && (
              <section className="budget-print-notes">
                <h3>Observações</h3>
                <p>{budget.notes}</p>
              </section>
            )}

            <footer className="budget-print-signature">
              <div className="budget-signature-line">Assinatura do tutor / aprovação</div>
            </footer>

            {isBudgetLocked(budget.status) ? (
              <p className="budget-locked-notice no-print" role="status">
                Orçamento aprovado: está bloqueado para alterações.
              </p>
            ) : (
              STATUS_ACTIONS[budget.status].length > 0 && (
                <div className="budget-status-actions no-print">
                  {STATUS_ACTIONS[budget.status].map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className={`budget-button${action.status === 'APPROVED' ? ' primary' : ''}`}
                      onClick={() => {
                        if (action.status === 'APPROVED' || action.status === 'REJECTED') {
                          setPendingStatus(action.status)
                          return
                        }
                        void changeStatus(action.status)
                      }}
                      disabled={updating}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )
            )}
          </article>
        )}

        {pendingStatus && (
          <ConfirmBudgetStatusDialog
            status={pendingStatus}
            submitting={updating}
            onCancel={() => setPendingStatus(null)}
            onConfirm={() => void changeStatus(pendingStatus)}
          />
        )}

        <Toast toast={toast} />
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
