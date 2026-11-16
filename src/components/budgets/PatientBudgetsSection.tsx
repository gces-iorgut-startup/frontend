import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Printer } from 'lucide-react'
import { BudgetsService } from '../../services/budgets.service'
import { getErrorMessage } from '../../lib/errorMessage'
import { formatCurrency } from '../../lib/currency'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../common/useToast'
import { Toast } from '../common/Toast'
import { BudgetStatusBadge } from './BudgetStatusBadge'
import { NewBudgetModal } from './NewBudgetModal'
import { BudgetDetailsPrintModal } from './BudgetDetailsPrintModal'
import type { Budget } from '../../types'
import '../../styles/budgets.css'

const SECTION_PAGE_SIZE = 50

interface PatientBudgetsSectionProps {
  patientId: string
}

export function PatientBudgetsSection({ patientId }: PatientBudgetsSectionProps) {
  const clinicId = useAuthStore((s) => s.user?.clinicId)
  const { toast, showToast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [openBudgetId, setOpenBudgetId] = useState<string | null>(null)
  const requestSeqRef = useRef(0)

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const seq = ++requestSeqRef.current
      if (!clinicId) {
        setError('Clínica não identificada.')
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      setError(null)
      try {
        const response = await BudgetsService.listBudgets(clinicId, {
          patientId,
          limit: SECTION_PAGE_SIZE,
        })
        if (seq !== requestSeqRef.current) return
        setBudgets(response.budgets)
        setTotal(response.total)
      } catch (err) {
        if (seq !== requestSeqRef.current) return
        setError(getErrorMessage(err, 'Não foi possível carregar os orçamentos.'))
      } finally {
        if (seq === requestSeqRef.current) setLoading(false)
      }
    },
    [clinicId, patientId],
  )

  useEffect(() => {
    void load()
    return () => {
      requestSeqRef.current += 1
    }
  }, [load])

  return (
    <section className="patient-records-panel budget-patient-section" aria-label="Orçamentos do paciente">
      <div className="budget-section-header">
        <h2>Orçamentos</h2>
        <button type="button" className="budget-button primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      {loading && <p className="budget-hint" data-testid="patient-budgets-loading">Carregando orçamentos...</p>}
      {error && (
        <div className="budget-error-box" role="alert">
          <p>{error}</p>
          <button type="button" className="budget-link-button" onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && !error && budgets.length === 0 && (
        <p className="budget-empty">Nenhum orçamento para este paciente.</p>
      )}

      {!loading && !error && budgets.length > 0 && (
        <div className="table-container">
          <table className="table budget-table">
            <thead>
              <tr>
                <th>Emissão</th>
                <th>Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget) => (
                <tr key={budget.id}>
                  <td>{new Date(budget.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>{formatCurrency(budget.totalAmount)}</td>
                  <td>
                    <BudgetStatusBadge status={budget.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="budget-link-button"
                      onClick={() => setOpenBudgetId(budget.id)}
                    >
                      <Printer size={14} /> Ver / Imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && total > budgets.length && (
        <p className="budget-hint">
          Exibindo os {budgets.length} orçamentos mais recentes de {total}.
        </p>
      )}

      {creating && (
        <NewBudgetModal
          defaultPatientId={patientId}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            showToast('Orçamento criado com sucesso.', 'success')
            void load({ silent: true })
          }}
        />
      )}

      {openBudgetId && (
        <BudgetDetailsPrintModal
          budgetId={openBudgetId}
          onClose={() => setOpenBudgetId(null)}
          onChanged={() => void load({ silent: true })}
        />
      )}

      <Toast toast={toast} />
    </section>
  )
}
