import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { clinicService } from '../../lib/clinicService'
import { getErrorMessage } from '../../lib/errorMessage'
import type { Clinic } from '../../types'

export interface ClinicCodeInputProps {
  value: string
  onChange: (value: string) => void
  onClinicResolved?: (clinic: Clinic | null) => void
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  placeholder?: string
  className?: string
}

export type ClinicCodeValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export function ClinicCodeInput({
  value,
  onChange,
  onClinicResolved,
  disabled = false,
  required = false,
  id = 'register-clinic-code',
  name = 'clinicCode',
  placeholder = 'Ex: PETLIFE-7A2',
  className = '',
}: ClinicCodeInputProps) {
  const [status, setStatus] = useState<ClinicCodeValidationStatus>('idle')
  const [feedback, setFeedback] = useState<string | null>(null)
  const onClinicResolvedRef = useRef(onClinicResolved)

  useEffect(() => {
    onClinicResolvedRef.current = onClinicResolved
  }, [onClinicResolved])

  useEffect(() => {
    const trimmed = value.trim().toUpperCase()

    if (trimmed.length < 3) {
      setStatus('idle')
      setFeedback(null)
      onClinicResolvedRef.current?.(null)
      return
    }

    setStatus('validating')
    setFeedback(null)

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const clinic = await clinicService.getClinicByCode(trimmed)
        if (cancelled) return
        setStatus('valid')
        setFeedback(clinic.name)
        onClinicResolvedRef.current?.(clinic)
      } catch (err: unknown) {
        if (cancelled) return
        setStatus('invalid')
        onClinicResolvedRef.current?.(null)

        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
        const statusCode = axiosErr?.response?.status

        if (statusCode === 404) {
          setFeedback('Clínica não encontrada. Verifique a sigla com o responsável.')
        } else if (statusCode === 422) {
          setFeedback('Clínica não possui um responsável ativo no momento.')
        } else {
          setFeedback(getErrorMessage(err, 'Erro ao validar o código da clínica.'))
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uppercaseVal = e.target.value.toUpperCase().replace(/\s+/g, '')
    onChange(uppercaseVal)
  }

  return (
    <div className={`clinic-code-input-container ${className}`}>
      <div className="form-input-wrapper">
        <input
          id={id}
          name={name}
          type="text"
          className={`form-input clinic-code-input ${
            status === 'valid' ? 'clinic-code-input-valid' : ''
          } ${status === 'invalid' ? 'input-error' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          required={required}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          data-testid="clinic-code-input"
          aria-invalid={status === 'invalid'}
          aria-busy={status === 'validating'}
        />

        <div className="clinic-code-input-status" aria-live="polite">
          {status === 'validating' && (
            <Loader2
              size={18}
              className="clinic-code-spinner"
              data-testid="clinic-code-spinner"
              aria-label="Validando código"
            />
          )}
          {status === 'valid' && (
            <CheckCircle2
              size={18}
              className="clinic-code-icon-success"
              data-testid="clinic-code-success-icon"
              aria-label="Código válido"
            />
          )}
          {status === 'invalid' && (
            <AlertCircle
              size={18}
              className="clinic-code-icon-error"
              data-testid="clinic-code-error-icon"
              aria-label="Código inválido"
            />
          )}
        </div>
      </div>

      {status === 'valid' && feedback && (
        <div
          className="clinic-code-feedback success"
          data-testid="clinic-code-success-msg"
        >
          <CheckCircle2 size={14} />
          <span>Clínica: <strong>{feedback}</strong></span>
        </div>
      )}

      {status === 'invalid' && feedback && (
        <div
          className="clinic-code-feedback error"
          data-testid="clinic-code-error-msg"
        >
          <AlertCircle size={14} />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  )
}
