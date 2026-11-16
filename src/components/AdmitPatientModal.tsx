import { useEffect, useState } from 'react'
import { BedDouble, X } from 'lucide-react'
import { PatientsService } from '../services/patients.service'
import { hospitalizationService } from '../lib/hospitalizationService'
import { getErrorMessage } from '../lib/errorMessage'
import { CustomSelect } from './common/CustomSelect'
import type { Hospitalization, Patient } from '../types'

interface AdmitPatientModalProps {
  clinicId: string
  /** Pacientes já internados: não entram na lista, para evitar o 409. */
  admittedPatientIds: string[]
  onClose: () => void
  onSuccess: (hospitalization: Hospitalization) => void
  /**
   * Falha de API sobe para o toast da página, como a issue #58 pede. O erro de
   * validação continua inline, porque é sobre o campo que a pessoa acabou de
   * preencher e precisa aparecer ao lado dele.
   */
  onError: (message: string) => void
}

export function AdmitPatientModal({
  clinicId,
  admittedPatientIds,
  onClose,
  onSuccess,
  onError,
}: AdmitPatientModalProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [patientId, setPatientId] = useState('')
  const [bedIdentifier, setBedIdentifier] = useState('')
  const [reason, setReason] = useState('')
  const [critical, setCritical] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    PatientsService.list()
      .then((response) => {
        if (active) setPatients(response.patients)
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err, 'Não foi possível carregar os pacientes.'))
      })
      .finally(() => {
        if (active) setLoadingPatients(false)
      })

    return () => {
      active = false
    }
  }, [])

  const options = patients
    .filter((patient) => !admittedPatientIds.includes(patient.id))
    .map((patient) => ({ value: patient.id, label: patient.name }))

  async function handleSubmit() {
    if (!patientId) {
      setError('Selecione o paciente.')
      return
    }
    if (!bedIdentifier.trim()) {
      setError('Informe a baia ou leito.')
      return
    }
    if (reason.trim().length < 3) {
      setError('Descreva o motivo da internação.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const hospitalization = await hospitalizationService.admitPatient(clinicId, {
        patientId,
        bedIdentifier,
        reason,
        status: critical ? 'CRITICAL' : undefined,
      })
      onSuccess(hospitalization)
    } catch (err: unknown) {
      // O modal fica aberto com o que foi digitado, para a pessoa poder tentar
      // de novo sem reescrever tudo.
      onError(getErrorMessage(err, 'Não foi possível admitir o paciente.'))
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

        <BedDouble className="patient-edit-modal-icon save" />
        <h3>Admitir paciente</h3>
        <p>Ocupe um leito e registre o motivo da internação.</p>

        {error && (
          <p
            className="patient-details-inline-error"
            style={{ fontSize: '0.875rem', marginTop: '8px' }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            marginTop: '20px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>
              Paciente
            </span>
            {loadingPatients ? (
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Carregando pacientes...
              </span>
            ) : options.length === 0 ? (
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Todos os pacientes cadastrados já estão internados.
              </span>
            ) : (
              <CustomSelect
                value={patientId}
                onChange={setPatientId}
                options={options}
                placeholder="Selecionar paciente"
              />
            )}
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>
              Baia / leito
            </span>
            <input
              type="text"
              value={bedIdentifier}
              onChange={(event) => setBedIdentifier(event.target.value)}
              placeholder="Ex.: Baia 03, UTI 01"
              maxLength={60}
              disabled={isSaving}
              aria-label="Baia ou leito"
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>
              Motivo da internação
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: pós-operatório de castração, observação de 24h"
              maxLength={2000}
              rows={3}
              disabled={isSaving}
              aria-label="Motivo da internação"
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left',
              fontSize: '0.875rem',
              color: '#475569',
            }}
          >
            <input
              type="checkbox"
              checked={critical}
              onChange={(event) => setCritical(event.target.checked)}
              disabled={isSaving}
            />
            Admitir já em estado crítico
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
            disabled={isSaving || loadingPatients}
          >
            {isSaving ? 'Admitindo...' : 'Admitir paciente'}
          </button>
        </div>
      </div>
    </div>
  )
}
