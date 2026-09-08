import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightToLine, Calendar, FileClock, Filter, Search, SearchX } from 'lucide-react'
import { APPOINTMENT_CATEGORY_LABELS } from '../../lib/appointmentCategory'
import { getErrorMessage } from '../../lib/errorMessage'
import { portalService } from '../../lib/portalService'
import type { AppointmentCategory, TutorPortalClinicalRecord } from '../../types'
import '../../styles/history.css'
import '../../styles/portal-history.css'

const PER_PAGE = 10

/**
 * Prontuários abertos fora da agenda não têm Appointment vinculado, então não
 * carregam categoria. Caem em "Consulta", que é o rótulo de OBSERVATION.
 */
const FALLBACK_TYPE = APPOINTMENT_CATEGORY_LABELS.OBSERVATION

interface TutorHistoryListItem {
  id: string
  patientId: string
  patientName: string
  date: string
  type: string
  vetName: string
}

function formatDate(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR')
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
}

function matchesDateFilter(itemDate: string, filterDate: string) {
  if (!filterDate || filterDate.length !== 10) return true
  return formatDate(itemDate) === filterDate
}

/** Tipo de atendimento: vem da categoria do agendamento que gerou o prontuário. */
function getTypeLabel(record: TutorPortalClinicalRecord) {
  const category = record.appointment?.category
  if (category && category in APPOINTMENT_CATEGORY_LABELS) {
    return APPOINTMENT_CATEGORY_LABELS[category as AppointmentCategory]
  }
  return FALLBACK_TYPE
}

function getPaginationPages(totalPages: number, page: number): Array<number | '...'> {
  const pages: Array<number | '...'> = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i)
    return pages
  }

  pages.push(1)

  if (page > 3) pages.push('...')

  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  for (let i = start; i <= end; i += 1) {
    pages.push(i)
  }

  if (page < totalPages - 2) pages.push('...')

  pages.push(totalPages)
  return pages
}

function HistoryEmptyState({
  filtered,
  onClearFilters,
}: {
  filtered: boolean
  onClearFilters: () => void
}) {
  if (filtered) {
    return (
      <div className="tutor-history-empty">
        <span className="tutor-history-empty-icon">
          <SearchX size={26} />
        </span>
        <h2>Nenhum atendimento encontrado</h2>
        <p>Nenhum registro corresponde à busca ou aos filtros aplicados.</p>
        <button type="button" className="tutor-history-empty-action" onClick={onClearFilters}>
          Limpar filtros
        </button>
      </div>
    )
  }

  return (
    <div className="tutor-history-empty">
      <span className="tutor-history-empty-icon">
        <FileClock size={26} />
      </span>
      <h2>Nenhum atendimento por aqui ainda</h2>
      <p>
        Assim que o seu pet passar por uma consulta, vacinação ou exame, o registro aparece nesta
        lista.
      </p>
    </div>
  )
}

export function TutorPortalHistoryPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState<TutorHistoryListItem[]>([])
  const [petCount, setPetCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterType, setFilterType] = useState('')
  const [appliedDate, setAppliedDate] = useState('')
  const [appliedType, setAppliedType] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadTutorHistory() {
      setLoading(true)
      setError('')

      try {
        const dashboard = await portalService.getDashboard()

        const petHistories = await Promise.all(
          dashboard.pets.map(async (pet) => {
            const history = await portalService.getPatientHistory(pet.id)
            return { pet, history }
          }),
        )

        const flattened = petHistories
          .flatMap(({ history }) =>
            history.clinicalRecords
              .filter((record) => record.finalized)
              .map((record) => ({
                id: record.id,
                patientId: history.patient.id,
                patientName: history.patient.name,
                // A data do atendimento é a do agendamento; createdAt é apenas
                // quando o prontuário foi aberto no sistema.
                date: record.appointment?.dateTime ?? record.createdAt,
                type: getTypeLabel(record),
                vetName: record.vet?.name || 'Não informado',
              })),
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        if (!cancelled) {
          setItems(flattened)
          setPetCount(dashboard.pets.length)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Não foi possível carregar o histórico do tutor.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadTutorHistory()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.type.toLowerCase().includes(normalizedSearch) ||
        item.vetName.toLowerCase().includes(normalizedSearch) ||
        item.patientName.toLowerCase().includes(normalizedSearch) ||
        formatDate(item.date).includes(normalizedSearch)

      const matchesType = !appliedType || item.type === appliedType
      const matchesDate = matchesDateFilter(item.date, appliedDate)

      return matchesSearch && matchesType && matchesDate
    })
  }, [items, search, appliedType, appliedDate])

  useEffect(() => {
    setPage(1)
  }, [search, appliedType, appliedDate])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PER_PAGE))
  const paginatedItems = filteredItems.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const typeOptions = Array.from(new Set(items.map((item) => item.type))).sort()

  // O protótipo do tutor assume um único pet. Com vários, a coluna evita
  // que atendimentos de pets diferentes fiquem indistinguíveis.
  const showPatient = petCount > 1

  const hasFilters = Boolean(search.trim() || appliedType || appliedDate)
  const isEmpty = filteredItems.length === 0

  function openRecord(item: TutorHistoryListItem) {
    navigate(`/portal/historico/${item.id}/pacientes/${item.patientId}`, {
      state: { from: '/portal/historico' },
    })
  }

  function handleApplyFilters() {
    setAppliedDate(filterDate)
    setAppliedType(filterType)
    setShowFilters(false)
  }

  function handleClearFilters() {
    setFilterDate('')
    setFilterType('')
    setAppliedDate('')
    setAppliedType('')
    setSearch('')
    setShowFilters(false)
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>Histórico</h1>

        <div className="history-actions">
          <div className="search-bar">
            <Search />
            <input
              type="text"
              placeholder="Pesquisar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            className="history-filter-toggle"
            type="button"
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter size={16} />
            Filtrar
          </button>
        </div>
      </div>

      <div className="history-content">
        <div className="history-table-card">
          {loading ? (
            <div className="history-state">Carregando histórico...</div>
          ) : error ? (
            <div className="history-state">{error}</div>
          ) : isEmpty ? (
            <HistoryEmptyState filtered={hasFilters} onClearFilters={handleClearFilters} />
          ) : (
            <>
              {/* Desktop: tabela do protótipo */}
              <table className="tutor-history-table">
                <thead>
                  <tr>
                    <th>Atendimento</th>
                    {showPatient && <th>Pet</th>}
                    <th>Profissional responsável</th>
                    <th>Data</th>
                    <th className="tutor-history-action-col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.type}</td>
                      {showPatient && <td>{item.patientName}</td>}
                      <td>{item.vetName}</td>
                      <td>{formatDate(item.date)}</td>
                      <td className="tutor-history-action-col">
                        <button
                          className="history-action-button"
                          type="button"
                          aria-label={`Ver detalhes do atendimento de ${formatDate(item.date)}`}
                          onClick={() => openRecord(item)}
                        >
                          <ArrowRightToLine size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile: mesma informação em cartões tocáveis */}
              <ul className="tutor-history-cards">
                {paginatedItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="tutor-history-card"
                      onClick={() => openRecord(item)}
                    >
                      <span className="tutor-history-card-main">
                        <span className="tutor-history-card-type">{item.type}</span>
                        <span className="tutor-history-card-date">{formatDate(item.date)}</span>
                      </span>

                      {showPatient && (
                        <span className="tutor-history-card-row">
                          <small>Pet</small>
                          {item.patientName}
                        </span>
                      )}

                      <span className="tutor-history-card-row">
                        <small>Profissional responsável</small>
                        {item.vetName}
                      </span>

                      <span className="tutor-history-card-cta" aria-hidden="true">
                        <ArrowRightToLine size={16} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="page-footer">
                <span className="page-footer-info">
                  Exibindo de {(page - 1) * PER_PAGE + 1} a{' '}
                  {Math.min(page * PER_PAGE, filteredItems.length)} de {filteredItems.length}{' '}
                  resultados
                </span>

                <div className="history-pagination">
                  <button
                    className="history-pagination-button"
                    type="button"
                    aria-label="Página anterior"
                    disabled={page === 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    &lt;
                  </button>

                  {getPaginationPages(totalPages, page).map((item, index) =>
                    item === '...' ? (
                      <span key={`ellipsis-${index}`} className="history-pagination-ellipsis">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        className={`history-pagination-button${item === page ? ' active' : ''}`}
                        type="button"
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}

                  <button
                    className="history-pagination-button"
                    type="button"
                    aria-label="Próxima página"
                    disabled={page === totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {showFilters && (
          <div className="history-filters-overlay" onClick={() => setShowFilters(false)}>
            <aside className="history-filters-card" onClick={(event) => event.stopPropagation()}>
              <div className="history-filters-header">
                <h2>Filtrar</h2>
                <button type="button" aria-label="Fechar filtros" onClick={() => setShowFilters(false)}>
                  ×
                </button>
              </div>

              <div className="history-filter-group">
                <label htmlFor="history-filter-type">Atendimento</label>
                <select
                  id="history-filter-type"
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                >
                  <option value="">Selecionar</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="history-filter-group">
                <label htmlFor="history-filter-date">Data</label>
                <div className="history-filter-input">
                  <input
                    id="history-filter-date"
                    type="text"
                    placeholder="dd/mm/aaaa"
                    value={filterDate}
                    maxLength={10}
                    onChange={(event) => setFilterDate(maskDate(event.target.value))}
                  />
                  <Calendar size={16} />
                </div>
              </div>

              <div className="history-filter-actions">
                <button type="button" className="ghost" onClick={handleClearFilters}>
                  Limpar filtros
                </button>
                <button type="button" className="primary" onClick={handleApplyFilters}>
                  Filtrar
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
