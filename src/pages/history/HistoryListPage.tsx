import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightToLine, Calendar, Filter, LoaderCircle, Search } from 'lucide-react'
import { getErrorMessage } from '../../lib/errorMessage'
import { historyService } from '../../lib/historyService'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import type { ClinicHistoryListItem } from '../../types'
import '../../styles/history.css'

const PER_PAGE = 10

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

export function HistoryListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ClinicHistoryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterSpecies, setFilterSpecies] = useState('')
  const [appliedDate, setAppliedDate] = useState('')
  const [appliedSpecies, setAppliedSpecies] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      setError('')

      try {
        const data = await historyService.getClinicHistory()
        if (!cancelled) {
          setItems(data)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Não foi possível carregar o histórico da clínica.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.patientName.toLowerCase().includes(normalizedSearch) ||
        item.tutorName.toLowerCase().includes(normalizedSearch) ||
        getPatientSpeciesLabel(item.species).toLowerCase().includes(normalizedSearch) ||
        item.vetName.toLowerCase().includes(normalizedSearch)

      const matchesSpecies = !appliedSpecies || item.species === appliedSpecies
      const matchesDate = matchesDateFilter(item.date, appliedDate)

      return matchesSearch && matchesSpecies && matchesDate
    })
  }, [items, search, appliedSpecies, appliedDate])

  useEffect(() => {
    setPage(1)
  }, [search, appliedSpecies, appliedDate])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PER_PAGE))
  const paginatedItems = filteredItems.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const speciesOptions = Array.from(new Set(items.map((item) => item.species))).sort()

  function handleApplyFilters() {
    setAppliedDate(filterDate)
    setAppliedSpecies(filterSpecies)
    setShowFilters(false)
  }

  function handleClearFilters() {
    setFilterDate('')
    setFilterSpecies('')
    setAppliedDate('')
    setAppliedSpecies('')
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
            <div className="history-state">
              <LoaderCircle className="care-spin" />
            </div>
          ) : error ? (
            <div className="history-state">{error}</div>
          ) : (
            <>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Tutor</th>
                    <th>Data</th>
                    <th>Espécie</th>
                    <th>Profissional responsável</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.patientName}</td>
                        <td>{item.tutorName}</td>
                        <td>{formatDate(item.date)}</td>
                        <td>{getPatientSpeciesLabel(item.species)}</td>
                        <td>{item.vetName}</td>
                        <td>
                          <button
                            className="history-action-button"
                            type="button"
                            onClick={() =>
                              navigate(`/historico/${item.id}/pacientes/${item.patientId}`)
                            }
                          >
                            <ArrowRightToLine size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="history-empty-row">
                        Nenhuma consulta encontrada com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="page-footer">
                <span className="page-footer-info">
                  Exibindo de {filteredItems.length === 0 ? 0 : (page - 1) * PER_PAGE + 1} a{' '}
                  {Math.min(page * PER_PAGE, filteredItems.length)} de {filteredItems.length}{' '}
                  resultados
                </span>

                <div className="history-pagination">
                  <button
                    className="history-pagination-button"
                    type="button"
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
                <button type="button" onClick={() => setShowFilters(false)}>
                  ×
                </button>
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

              <div className="history-filter-group">
                <label htmlFor="history-filter-species">Espécie</label>
                <select
                  id="history-filter-species"
                  value={filterSpecies}
                  onChange={(event) => setFilterSpecies(event.target.value)}
                >
                  <option value="">Selecionar</option>
                  {speciesOptions.map((species) => (
                    <option key={species} value={species}>
                      {getPatientSpeciesLabel(species)}
                    </option>
                  ))}
                </select>
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
