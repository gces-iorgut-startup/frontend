import { useState } from 'react'
import { LogOut, X } from 'lucide-react'
import { hospitalizationService } from '../lib/hospitalizationService'
import { getErrorMessage } from '../lib/errorMessage'
import type { Hospitalization } from '../types'

interface DischargePatientModalProps {
  clinicId: string
  hospitalizationId: string
  patientName: string
  onClose: () => void
  onSuccess: (hospitalization: Hospitalization) => void
  /** Falha de API sobe para o toast da página, como a issue #58 pede. */
  onError: (message: string) => void
}

export function DischargePatientModal({
  clinicId,
  hospitalizationId,
  patientName,
  onClose,
  onSuccess,
  onError,
}: DischargePatientModalProps) {
  const [dischargeNotes, setDischargeNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit() {
    setIsSaving(true)

    try {
      const hospitalization = await hospitalizationService.discharge(
        clinicId,
        hospitalizationId,
        dischargeNotes
      )
      onSuccess(hospitalization)
    } catch (err: unknown) {
      // Modal fica aberto com as orientações digitadas, para poder tentar
      // de novo sem reescrever.
      onError(getErrorMessage(err, 'Não foi possível conceder a alta.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="patient-edit-modal-overlay" role="presentation">
      <div className="patient-edit-modal" style={{ minWidth: '440px' }}>
        <button
          className="modal-close-button"
          onClick={onClose}
          type="button"
          aria-label="Fechar"
          disabled={isSaving}
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

        <LogOut className="patient-edit-modal-icon save" />
        <h3>Conceder alta médica</h3>
        <p>
          {patientName} deixa a internação e o leito é liberado. Depois da alta não é possível
          registrar novas aferições.
        </p>

        <div style={{ marginTop: '20px', marginBottom: '24px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>
              Orientações pós-alta e prescrições (opcional)
            </span>
            <textarea
              value={dischargeNotes}
              onChange={(event) => setDischargeNotes(event.target.value)}
              placeholder="Ex.: repouso por 7 dias, retorno em 15 dias, antibiótico 2x ao dia"
              maxLength={4000}
              rows={5}
              disabled={isSaving}
              aria-label="Orientações pós-alta"
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </label>
        </div>

        <div className="patient-edit-modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button
            type="button"
            className="confirm save"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
          >
            {isSaving ? 'Concedendo...' : 'Conceder alta'}
          </button>
        </div>
      </div>
    </div>
  )
}
