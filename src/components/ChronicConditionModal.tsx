import { useRef, useState } from 'react'
import { HeartPulse, X } from 'lucide-react'
import { ChronicConditionsService } from '../services/chronicConditions.service'
import { getErrorMessage } from '../lib/errorMessage'
import { civilDateToIso, getLocalDateInputValue, isoToCivilDate } from './chronicConditionDates'
import type {
  ChronicCondition,
  ChronicConditionStatus,
  UpdateChronicConditionRequest,
} from '../types'

const NAME_MAX_LENGTH = 120
const OBSERVATIONS_MAX_LENGTH = 2000

interface ChronicConditionModalProps {
  patientId: string
  condition?: ChronicCondition
  onClose: () => void
  onSuccess: (condition: ChronicCondition) => void
}

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#334155',
  marginBottom: '4px',
} as const

const fieldStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
} as const

export function ChronicConditionModal({
  patientId,
  condition,
  onClose,
  onSuccess,
}: ChronicConditionModalProps) {
  const isEditing = Boolean(condition)
  const today = getLocalDateInputValue()

  const [name, setName] = useState(condition?.name ?? '')
  const [diagnosedAt, setDiagnosedAt] = useState(isoToCivilDate(condition?.diagnosedAt))
  const [status, setStatus] = useState<ChronicConditionStatus>(condition?.status ?? 'ACTIVE')
  const [observations, setObservations] = useState(condition?.observations ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submitLock = useRef(false)

  function validate(): string | null {
    const trimmedName = name.trim()
    if (trimmedName.length < 2) return 'O nome da patologia deve ter no mínimo 2 caracteres.'
    if (trimmedName.length > NAME_MAX_LENGTH) {
      return `O nome da patologia deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`
    }
    if (diagnosedAt && diagnosedAt > today) return 'A data de diagnóstico não pode ser futura.'
    if (observations.length > OBSERVATIONS_MAX_LENGTH) {
      return `As observações devem ter no máximo ${OBSERVATIONS_MAX_LENGTH} caracteres.`
    }
    return null
  }

  function buildUpdatePayload(original: ChronicCondition): UpdateChronicConditionRequest {
    const payload: UpdateChronicConditionRequest = {}
    const trimmedName = name.trim()
    const trimmedObservations = observations.trim()

    if (trimmedName !== original.name) payload.name = trimmedName
    if (status !== original.status) payload.status = status

    const originalDate = isoToCivilDate(original.diagnosedAt)
    if (diagnosedAt !== originalDate) {
      payload.diagnosedAt = diagnosedAt ? civilDateToIso(diagnosedAt) : null
    }

    if (trimmedObservations !== (original.observations ?? '')) {
      payload.observations = trimmedObservations || null
    }

    return payload
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitLock.current) return

    setError('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    submitLock.current = true
    setIsSubmitting(true)

    try {
      let saved: ChronicCondition

      if (condition) {
        const payload = buildUpdatePayload(condition)
        if (Object.keys(payload).length === 0) {
          onClose()
          return
        }
        saved = await ChronicConditionsService.update(condition.id, payload)
      } else {
        const trimmedObservations = observations.trim()
        saved = await ChronicConditionsService.create({
          patientId,
          name: name.trim(),
          status,
          ...(diagnosedAt ? { diagnosedAt: civilDateToIso(diagnosedAt) } : {}),
          ...(trimmedObservations ? { observations: trimmedObservations } : {}),
        })
      }

      onSuccess(saved)
      onClose()
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          isEditing ? 'Não foi possível atualizar a patologia.' : 'Não foi possível registrar a patologia.',
        ),
      )
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="patient-edit-modal-overlay" role="presentation">
      <div
        className="patient-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chronic-condition-modal-title"
        style={{ minWidth: '420px', maxWidth: '520px' }}
      >
        <button
          className="modal-close-button"
          onClick={onClose}
          type="button"
          disabled={isSubmitting}
          aria-label="Fechar"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <X size={20} />
        </button>

        <HeartPulse className="patient-edit-modal-icon save" />
        <h3 id="chronic-condition-modal-title">
          {isEditing ? 'Editar Patologia Crônica' : 'Registrar Patologia Crônica'}
        </h3>
        <p>Informe os dados da patologia diagnosticada para este paciente.</p>

        {error && (
          <p
            className="patient-details-inline-error"
            role="alert"
            style={{ fontSize: '0.875rem', marginTop: '8px', color: '#ef4444' }}
          >
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}
        >
          <div>
            <label htmlFor="chronic-condition-name" style={fieldLabelStyle}>
              Nome da Patologia *
            </label>
            <input
              id="chronic-condition-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Diabetes mellitus, Cardiopatia"
              maxLength={NAME_MAX_LENGTH}
              disabled={isSubmitting}
              style={fieldStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="chronic-condition-diagnosed-at" style={fieldLabelStyle}>
                Data do Diagnóstico
              </label>
              <input
                id="chronic-condition-diagnosed-at"
                type="date"
                value={diagnosedAt}
                max={today}
                onChange={(e) => setDiagnosedAt(e.target.value)}
                disabled={isSubmitting}
                style={fieldStyle}
              />
            </div>

            <div>
              <label htmlFor="chronic-condition-status" style={fieldLabelStyle}>
                Status
              </label>
              <select
                id="chronic-condition-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ChronicConditionStatus)}
                disabled={isSubmitting}
                style={fieldStyle}
              >
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
                <option value="RESOLVED">Resolvida</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="chronic-condition-observations" style={fieldLabelStyle}>
              Observações
            </label>
            <textarea
              id="chronic-condition-observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              maxLength={OBSERVATIONS_MAX_LENGTH}
              placeholder="Tratamento, medicação, cuidados..."
              disabled={isSubmitting}
              style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div
            className="patient-edit-modal-actions"
            style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
          >
            <button type="button" className="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="confirm save" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Patologia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
