import { useEffect, useId, useState } from 'react'
import { PatientsService } from '../../services/patients.service'
import { getErrorMessage } from '../../lib/errorMessage'
import type { Patient } from '../../types'
import '../../styles/budgets.css'

const SEARCH_DEBOUNCE_MS = 350
const MIN_SEARCH_LENGTH = 2

interface PatientAutocompleteProps {
  selected: Patient | null
  onSelect: (patient: Patient) => void
  onClear: () => void
  disabled?: boolean
}

// Busca no servidor por nome do paciente ou do tutor (mesma busca de /patients).
export function PatientAutocomplete({ selected, onSelect, onClear, disabled = false }: PatientAutocompleteProps) {
  const inputId = useId()
  const [term, setTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTerm(term.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [term])

  useEffect(() => {
    if (selected || debouncedTerm.length < MIN_SEARCH_LENGTH) {
      setResults([])
      setError(null)
      return undefined
    }

    let active = true
    setLoading(true)
    setError(null)
    PatientsService.list(1, debouncedTerm)
      .then((response) => {
        if (active) setResults(response.patients)
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err, 'Não foi possível buscar pacientes.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [debouncedTerm, selected])

  if (selected) {
    return (
      <div className="budget-autocomplete-selected">
        <span data-testid="selected-patient">
          {selected.name}
          {selected.tutor ? ` · ${selected.tutor.fullName}` : ''}
        </span>
        {!disabled && (
          <button type="button" className="budget-link-button" onClick={onClear}>
            Trocar paciente
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="budget-autocomplete">
      <label htmlFor={inputId} className="budget-field-label">
        Paciente
      </label>
      <input
        id={inputId}
        type="search"
        className="budget-input"
        placeholder="Digite o nome do paciente ou do tutor"
        value={term}
        disabled={disabled}
        autoComplete="off"
        onChange={(event) => setTerm(event.target.value)}
      />

      {term.trim().length > 0 && term.trim().length < MIN_SEARCH_LENGTH && (
        <p className="budget-hint">Digite pelo menos 2 caracteres.</p>
      )}
      {loading && <p className="budget-hint">Buscando pacientes...</p>}
      {error && <p className="budget-error" role="alert">{error}</p>}

      {!loading && !error && debouncedTerm.length >= MIN_SEARCH_LENGTH && results.length === 0 && (
        <p className="budget-hint">Nenhum paciente encontrado.</p>
      )}

      {results.length > 0 && (
        <div className="budget-autocomplete-results" role="listbox" aria-label="Pacientes encontrados">
          {results.map((patient) => (
            <button
              key={patient.id}
              type="button"
              role="option"
              aria-selected={false}
              className="budget-autocomplete-option"
              onClick={() => onSelect(patient)}
            >
              <strong>{patient.name}</strong>
              <span>{patient.tutor ? patient.tutor.fullName : 'Tutor não informado'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
