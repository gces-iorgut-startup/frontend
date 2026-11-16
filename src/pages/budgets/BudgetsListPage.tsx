import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  ConfirmBudgetStatusDialog,
  type ConfirmableBudgetStatus,
} from '../../components/budgets/ConfirmBudgetStatusDialog'
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
  const [pendingConfirm, setPendingConfirm] = useState<{
    budget: Budget
    status: ConfirmableBudgetStatus
  } | null>(null)

  const requestSeqRef = useRef(0)
  const silentReloadRef = useRef(false)
  const prevSearchInputRef = useRef(searchInput)

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
    if (prevSearchInputRef.current === searchInput) return undefined
    prevSearchInputRef.current = searchInput
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim()
      setSearch(trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : '')
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let active = true
    const seq = ++requestSeqRef.current
    const silent = silentReloadRef.current
    silentReloadRef.current = false

    async function fetchBudgets() {
      if (!clinicId) {
        if (!active || seq !== requestSeqRef.current) return
        setError('Clínica não identificada.')
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      setError(null)
      let redirecting = false
      try {
        const response = await BudgetsService.listBudgets(clinicId, params)
        if (!active || seq !== requestSeqRef.current) return
        const nextTotalPages = Math.max(1, Math.ceil(response.total / PAGE_SIZE))
        if ((params.page ?? 1) > nextTotalPages) {
          redirecting = true
          silentReloadRef.current = silent
          setTotal(response.total)
          setPage(nextTotalPages)
          return
        }
        setBudgets(response.budgets)
        setTotal(response.total)
      } catch (err) {
        if (!active || seq !== requestSeqRef.current) return
        setError(getErrorMessage(err, 'Não foi possível carregar os orçamentos.'))
      } finally {
        if (active && seq === requestSeqRef.current && !redirecting) {
          setLoading(false)
        }
      }
    }

    void fetchBudgets()
    return () => {
      active = false
    }
  }, [clinicId, params, reloadKey])

  const reload = useCallback((options?: { silent?: boolean }) => {
    silentReloadRef.current = Boolean(options?.silent)
    setReloadKey((key) => key + 1)
  }, [])

  const confirmQuickStatus = async () => {
    if (!clinicId || !pendingConfirm) return
    const { budget, status: next } = pendingConfirm
    setBusyBudgetId(budget.id)
    try {
      await BudgetsService.updateBudgetStatus(clinicId, budget.id, next)
      showToast('Status do orçamento atualizado.', 'success')
      setPendingConfirm(null)
      reload({ silent: true })
    } catch (err) {
      showToast(getErrorMessage(err, 'Não foi possível atualizar o status.'), 'error')
      setPendingConfirm(null)
    } finally {
      setBusyBudgetId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const firstItem = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(safePage * PAGE_SIZE, total)

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
          <button type="button" className="budget-link-button" onClick={() => reload()}>
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
                            onClick={() => setPendingConfirm({ budget, status: 'APPROVED' })}
                            disabled={busy || isBudgetLocked(budget.status)}
                          >
                            <Check size={14} /> Aprovar
                          </button>
                          <button
                            type="button"
                            className="budget-link-button danger"
                            onClick={() => setPendingConfirm({ budget, status: 'REJECTED' })}
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
            reload({ silent: true })
          }}
        />
      )}

      {openBudgetId && (
        <BudgetDetailsPrintModal
          budgetId={openBudgetId}
          onClose={() => setOpenBudgetId(null)}
          onChanged={() => reload({ silent: true })}
        />
      )}

      {pendingConfirm && (
        <ConfirmBudgetStatusDialog
          status={pendingConfirm.status}
          submitting={busyBudgetId === pendingConfirm.budget.id}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={() => void confirmQuickStatus()}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
