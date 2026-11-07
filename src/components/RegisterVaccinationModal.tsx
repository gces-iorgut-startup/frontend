import { useState } from 'react'
import { Syringe, X } from 'lucide-react'
import { VaccinationsService } from '../services/vaccinations.service'
import { getErrorMessage } from '../lib/errorMessage'
import type { Vaccination, VaccinationStatus } from '../types'

interface RegisterVaccinationModalProps {
  patientId: string
  onClose: () => void
  onSuccess: (vaccination: Vaccination) => void
}

function getTodayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function RegisterVaccinationModal({
  patientId,
  onClose,
  onSuccess,
}: RegisterVaccinationModalProps) {
  const [vaccineName, setVaccineName] = useState('')
  const [appliedAt, setAppliedAt] = useState(getTodayLocalDate())
  const [nextDoseAt, setNextDoseAt] = useState('')
  const [doseNumber, setDoseNumber] = useState<string>('1')
  const [intervalDays, setIntervalDays] = useState<string>('')
  const [status, setStatus] = useState<VaccinationStatus>('UP_TO_DATE')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedName = vaccineName.trim()
    if (!trimmedName || trimmedName.length < 2) {
      setError('O nome da vacina deve ter no mínimo 2 caracteres.')
      return
    }

    if (status === 'UP_TO_DATE' && !appliedAt) {
      setError('Data de aplicação é obrigatória para vacinas aplicadas.')
      return
    }

    if (status === 'PENDING' && !nextDoseAt) {
      setError('Data da próxima dose é obrigatória para vacinas agendadas.')
      return
    }

    if (status === 'OVERDUE' && !appliedAt && !nextDoseAt) {
      setError('Informe a data de aplicação ou a data de vencimento da dose.')
      return
    }

    setIsSubmitting(true)

    try {
      const parsedDose = doseNumber ? parseInt(doseNumber, 10) : undefined
      const parsedInterval = intervalDays ? parseInt(intervalDays, 10) : undefined

      const newVaccination = await VaccinationsService.create({
        patientId,
        vaccineName: trimmedName,
        status,
        appliedAt: appliedAt && status !== 'PENDING' ? new Date(`${appliedAt}T12:00:00Z`).toISOString() : undefined,
        nextDoseAt: nextDoseAt ? new Date(`${nextDoseAt}T12:00:00Z`).toISOString() : undefined,
        doseNumber: parsedDose && !isNaN(parsedDose) && parsedDose > 0 ? parsedDose : undefined,
        intervalDays: parsedInterval && !isNaN(parsedInterval) && parsedInterval > 0 ? parsedInterval : undefined,
      })

      onSuccess(newVaccination)
      onClose()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível registrar a vacina.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="patient-edit-modal-overlay" role="presentation">
      <div className="patient-edit-modal" style={{ minWidth: '420px', maxWidth: '520px' }}>
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

        <Syringe className="patient-edit-modal-icon save" />
        <h3>Registrar Vacinação</h3>
        <p>Informe os dados da aplicação e o intervalo para cálculo da próxima dose.</p>

        {error && (
          <p
            className="patient-details-inline-error"
            role="alert"
            style={{ fontSize: '0.875rem', marginTop: '8px', color: '#ef4444' }}
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          <div>
            <label htmlFor="vaccine-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
              Nome da Vacina *
            </label>
            <input
              id="vaccine-name"
              type="text"
              required
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              placeholder="Ex: V10, Antirrábica, Gripe Canina"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="vaccine-status" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                Status da Vacina
              </label>
              <select
                id="vaccine-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VaccinationStatus)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                }}
              >
                <option value="UP_TO_DATE">Aplicada (Em dia)</option>
                <option value="PENDING">Pendente (Agendada)</option>
                <option value="OVERDUE">Atrasada</option>
              </select>
            </div>

            <div>
              <label htmlFor="vaccine-dose-number" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                Nº da Dose
              </label>
              <input
                id="vaccine-dose-number"
                type="number"
                min={1}
                value={doseNumber}
                onChange={(e) => setDoseNumber(e.target.value)}
                placeholder="Ex: 1"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {status === 'PENDING' ? (
            <div>
              <label htmlFor="vaccine-next-dose-at" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                Data Prevista / Próxima Dose *
              </label>
              <input
                id="vaccine-next-dose-at"
                type="date"
                required
                value={nextDoseAt}
                onChange={(e) => setNextDoseAt(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="vaccine-applied-at" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                  Data de Aplicação *
                </label>
                <input
                  id="vaccine-applied-at"
                  type="date"
                  required
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label htmlFor="vaccine-interval-days" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                  Intervalo (dias)
                </label>
                <input
                  id="vaccine-interval-days"
                  type="number"
                  min={1}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  placeholder="Ex: 21 (vazio se única)"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 8px 0' }}>
            {status === 'PENDING'
              ? '💡 Para vacinas agendadas, a data prevista da próxima dose é obrigatória.'
              : '💡 Ao informar o intervalo em dias, a próxima dose é calculada e persistida automaticamente no cronograma.'}
          </p>

          <div className="patient-edit-modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="confirm save"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Vacina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
