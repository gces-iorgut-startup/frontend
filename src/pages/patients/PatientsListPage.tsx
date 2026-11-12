import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, LogIn, X, Calendar } from 'lucide-react'
import { api } from '../../lib/api'
import { getPatientSpeciesLabel, PATIENT_SPECIES_OPTIONS } from '../../lib/patientFields'
import type { Patient } from '../../types'
import '../../styles/patients.css'

export function PatientsListPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchError, setSearchError] = useState('')
  
  const [showFilter, setShowFilter] = useState(false)
  const [filterSpecies, setFilterSpecies] = useState('')
  const [filterDate, setFilterDate] = useState('')
  
  const [activeSpecies, setActiveSpecies] = useState('')
  const [activeDate, setActiveDate] = useState('')
  
  const [loading, setLoading] = useState(true)
  const perPage = 10

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, perPage }
      if (debouncedSearch) params.search = debouncedSearch
      if (activeSpecies) params.species = activeSpecies
      if (activeDate) params.updateDate = activeDate
      const response = await api.get('/patients', { params })
      setPatients(response.data.patients ?? [])
      setTotal(response.data.total ?? 0)
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, activeSpecies, activeDate])

  useEffect(() => {
    const normalizedSearch = search.trim()
    if (normalizedSearch.length === 1) {
      setSearchError('Digite pelo menos 2 caracteres para pesquisar.')
      return
    }

    setSearchError('')
    const timer = window.setTimeout(() => setDebouncedSearch(normalizedSearch), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, activeSpecies, activeDate])

  const applyFilters = () => {
    setActiveSpecies(filterSpecies)
    setActiveDate(filterDate)
    setPage(1)
    setShowFilter(false)
  }

  const clearFilters = () => {
    setFilterSpecies('')
    setFilterDate('')
    setActiveSpecies('')
    setActiveDate('')
    setPage(1)
    setShowFilter(false)
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const startItem = total > 0 ? (page - 1) * perPage + 1 : 0
  const endItem = Math.min(page * perPage, total)

  // Masks
  function maskDate(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    return digits
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
  }

  function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('pt-BR')
    } catch {
      return '—'
    }
  }

  function getPaginationPages(): (number | '...')[] {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, 2, 3)
      if (page > 4) pages.push('...')
      const start = Math.max(4, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }
      if (page < totalPages - 3) pages.push('...')
      if (!pages.includes(totalPages - 1)) pages.push(totalPages - 1)
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="patients-page">
      <div className="patients-header">
        <h1>Pacientes</h1>
        <div className="patients-header-actions">
          <div className="search-bar">
            <Search />
            <input
              id="patient-search"
              type="text"
              placeholder="Buscar por paciente, tutor ou CPF"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-invalid={Boolean(searchError)}
              aria-describedby={searchError ? 'patient-search-error' : undefined}
            />
            {searchError && <span id="patient-search-error" className="patient-search-error">{searchError}</span>}
          </div>
          <div className="patients-filter-wrapper">
            <button
              className="patients-filter-btn"
              id="patient-filter-btn"
              type="button"
              onClick={() => setShowFilter(!showFilter)}
            >
              <Filter />
              Filtrar
            </button>

            {showFilter && (
              <div className="patients-filter-overlay" onClick={() => setShowFilter(false)}>
                <div
                  className="patients-filter-popover"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="patients-filter-popover-header">
                    <h3>Filtrar</h3>
                    <button
                      type="button"
                      className="patients-filter-close"
                      onClick={() => setShowFilter(false)}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="patients-filter-field">
                    <label htmlFor="patients-filter-species">Espécie</label>
                    <select
                      id="patients-filter-species"
                      className="patients-filter-select"
                      value={filterSpecies}
                      onChange={(e) => setFilterSpecies(e.target.value)}
                    >
                      <option value="">Selecionar</option>
                      {PATIENT_SPECIES_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="patients-filter-field patients-filter-field-date">
                    <label htmlFor="patients-filter-date">Data</label>
                    <div className="patients-filter-input">
                      <input
                        id="patients-filter-date"
                        type="text"
                        placeholder="dd/mm/aaaa"
                        value={filterDate}
                        onChange={(e) => setFilterDate(maskDate(e.target.value))}
                        maxLength={10}
                      />
                      <Calendar size={18} />
                    </div>
                  </div>

                  <div className="patients-filter-actions">
                    <button type="button" className="ghost" onClick={clearFilters}>
                      Limpar filtros
                    </button>
                    <button type="button" className="primary" onClick={applyFilters}>
                      Filtrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            className="patients-add-btn"
            id="patient-add-btn"
            onClick={() => navigate('/pacientes/cadastrar')}
          >
            <Plus />
            Cadastrar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="patients-loading">
          <div className="spinner spinner-dark" />
        </div>
      ) : patients.length === 0 ? (
        <div className="patients-empty">
          <p>
            {debouncedSearch
              ? `Nenhum paciente encontrado para “${debouncedSearch}”.`
              : 'Nenhum paciente encontrado.'}
          </p>
        </div>
      ) : (
        <>
          <div className="table-container patients-table-card">
            <table className="table patients-table" id="patients-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Tutor</th>
                  <th>Última consulta</th>
                  <th>Espécie</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.tutor?.fullName ?? '—'}</td>
                    <td>{formatDate(p.updatedAt)}</td>
                    <td>{getPatientSpeciesLabel(p.species)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="table-action-btn"
                        title="Ver detalhes"
                        onClick={() => navigate(`/pacientes/${p.id}`)}
                      >
                        <LogIn size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="page-footer">
            <span className="page-footer-info">
              Exibindo de {startItem} a {endItem} de {total} resultados
            </span>
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                &lt;
              </button>
              {getPaginationPages().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="pagination-btn" style={{ border: 'none', cursor: 'default' }}>
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`pagination-btn${page === p ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                &gt;
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
