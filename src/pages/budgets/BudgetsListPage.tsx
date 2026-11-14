import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Printer, Check, X as XIcon } from 'lucide-react'
import { BudgetsService } from '../../services/budgets.service'
import { getErrorMessage } from '../../lib/errorMessage'
import { formatCurrency } from '../../lib/currency'
import { BUDGET_STATUS_OPTIONS, isBudgetLocked } from '../../lib/budgetStatus'
import { getPaginationPages } from '../../lib/pagination'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/common/useToast'
import { Toast } from '../../components/common/Toast'
import { BudgetStatusBadge } from '../../components/budgets/BudgetStatusBadge'
import { NewBudgetModal } from '../../components/budgets/NewBudgetModal'
import { BudgetDetailsPrintModal } from '../../components/budgets/BudgetDetailsPrintModal'
import { formatCivilDate } from '../../components/chronicConditionDates'
import type { Budget, BudgetStatus, ListBudgetsParams } from '../../types'
import '../../styles/budgets.css'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 350
const MIN_SEARCH_LENGTH = 2

// Início e fim do dia LOCAL escolhido, convertidos para ISO (o servidor filtra por instante).
function startOfDayIso(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString()
}

function endOfDayIso(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString()
}

export function BudgetsListPage() {
  const clinicId = useAuthStore((s) => s.user?.clinicId)
  const { toast, showToast } = useToast()

  const [status, setStatus] = useState<BudgetStatus | ''>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [creating, setCreating] = useState(false)
  const [openBudgetId, setOpenBudgetId] = useState<string | null>(null)
  const [busyBudgetId, setBusyBudgetId] = useState<string | null>(null)

  const params = useMemo<ListBudgetsParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      status: status || undefined,
      search: search.length >= MIN_SEARCH_LENGTH ? search : undefined,
      from: from ? startOfDayIso(from) : undefined,
      to: to ? endOfDayIso(to) : undefined,
    }),
    [page, status, search, from, to],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim()
      setSearch(trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : '')
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    if (!clinicId) {
      setError('Clínica não identificada.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await BudgetsService.listBudgets(clinicId, params)
      setBudgets(response.budgets)
      setTotal(response.total)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar os orçamentos.'))
    } finally {
      setLoading(false)
    }
  }, [clinicId, params])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  const reload = () => setReloadKey((key) => key + 1)

  const quickStatus = async (budget: Budget, next: BudgetStatus) => {
    if (!clinicId) return
    setBusyBudgetId(budget.id)
    try {
      await BudgetsService.updateBudgetStatus(clinicId, budget.id, next)
      showToast('Status do orçamento atualizado.', 'success')
      reload()
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível atualizar o status.'), 'error')
    } finally {
      setBusyBudgetId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="budget-page">
      <header className="budget-page-header">
        <h1>Orçamentos</h1>
        <button type="button" className="budget-button primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Novo Orçamento
        </button>
      </header>

      <div className="budget-filters" role="search">
        <label className="budget-field">
          <span className="budget-field-label">Status</span>
          <select
            aria-label="Filtrar por status"
            className="budget-input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as BudgetStatus | '')
              setPage(1)
            }}
          >
            {BUDGET_STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="budget-field budget-field-grow">
          <span className="budget-field-label">Paciente ou tutor</span>
          <input
            type="search"
            aria-label="Buscar por paciente ou tutor"
            className="budget-input"
            placeholder="Nome do paciente ou do tutor"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <label className="budget-field">
          <span className="budget-field-label">Emitido de</span>
          <input
            type="date"
            aria-label="Data inicial"
            className="budget-input"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPage(1)
            }}
          />
        </label>

        <label className="budget-field">
          <span className="budget-field-label">Até</span>
          <input
            type="date"
            aria-label="Data final"
            className="budget-input"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPage(1)
            }}
          />
        </label>
      </div>

      {loading && <p className="budget-hint" data-testid="budgets-loading">Carregando orçamentos...</p>}

      {error && (
        <div className="budget-error-box" role="alert">
          <p>{error}</p>
          <button type="button" className="budget-link-button" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && budgets.length === 0 && (
        <p className="budget-empty">Nenhum orçamento encontrado com os filtros atuais.</p>
      )}

      {!loading && !error && budgets.length > 0 && (
        <div className="table-container">
          <table className="table budget-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Tutor</th>
                <th>Emissão</th>
                <th>Validade</th>
                <th>Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget) => {
                const busy = busyBudgetId === budget.id
                return (
                  <tr key={budget.id}>
                    <td>{budget.patient?.name ?? '—'}</td>
                    <td>{budget.tutor?.fullName ?? '—'}</td>
                    <td>{new Date(budget.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>{formatCivilDate(budget.validUntil)}</td>
                    <td>{formatCurrency(budget.totalAmount)}</td>
                    <td>
                      <BudgetStatusBadge status={budget.status} />
                    </td>
                    <td className="budget-actions">
                      <button type="button" className="budget-link-button" onClick={() => setOpenBudgetId(budget.id)}>
                        <Printer size={14} /> Visualizar / Imprimir
                      </button>
                      {budget.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            className="budget-link-button"
                            onClick={() => void quickStatus(budget, 'APPROVED')}
                            disabled={busy || isBudgetLocked(budget.status)}
                          >
                            <Check size={14} /> Aprovar
                          </button>
                          <button
                            type="button"
                            className="budget-link-button danger"
                            onClick={() => void quickStatus(budget, 'REJECTED')}
                            disabled={busy}
                          >
                            <XIcon size={14} /> Recusar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className="page-footer">
          <span className="page-footer-info">
            Exibindo de {firstItem} a {lastItem} de {total} resultados
          </span>
          <nav className="pagination" aria-label="Paginação de orçamentos">
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            {getPaginationPages(page, totalPages).map((item, index) =>
              item === '...' ? (
                <span key={`gap-${index}`} className="pagination-gap">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`pagination-btn${item === page ? ' active' : ''}`}
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              className="pagination-btn"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Próxima
            </button>
          </nav>
        </div>
      )}

      {creating && (
        <NewBudgetModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            showToast('Orçamento criado com sucesso.', 'success')
            reload()
          }}
        />
      )}

      {openBudgetId && (
        <BudgetDetailsPrintModal
          budgetId={openBudgetId}
          onClose={() => setOpenBudgetId(null)}
          onChanged={reload}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
