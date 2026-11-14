import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, HeartPulse, LoaderCircle, LogOut, Stethoscope } from 'lucide-react'
import { hospitalizationService } from '../../lib/hospitalizationService'
import { getErrorMessage } from '../../lib/errorMessage'
import {
  formatDateTime,
  formatHospitalizationDuration,
  formatTime,
  getHospitalizationStatusLabel,
} from '../../lib/hospitalizationFields'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import { useNow } from '../../lib/useNow'
import { useAuthStore } from '../../stores/authStore'
import { HospitalizationEvolutionForm } from '../../components/HospitalizationEvolutionForm'
import { DischargePatientModal } from '../../components/DischargePatientModal'
import { Toast, type ToastState } from '../../components/common/Toast'
import type { HospitalizationDetails, HospitalizationEvolution } from '../../types'
import '../../styles/hospitalization.css'

function VitalSigns({ evolution }: { evolution: HospitalizationEvolution }) {
  const vitals = [
    evolution.temperature !== null ? `${evolution.temperature} °C` : null,
    evolution.heartRate !== null ? `FC ${evolution.heartRate} bpm` : null,
    evolution.respiratoryRate !== null ? `FR ${evolution.respiratoryRate} mpm` : null,
    evolution.mucousMembranes,
  ].filter(Boolean)

  if (vitals.length === 0) {
    return <span className="hospitalization-timeline-vitals empty">Sem sinais vitais aferidos</span>
  }

  return <span className="hospitalization-timeline-vitals">{vitals.join(' · ')}</span>
}

export function HospitalizationDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const clinicId = useAuthStore((state) => state.user?.clinicId)
  const navigate = useNavigate()

  const [details, setDetails] = useState<HospitalizationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDischargeModal, setShowDischargeModal] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Hook antes de qualquer early return. O timer para depois da alta, porque
  // aí o tempo de internação é fixo.
  const now = useNow(60_000, details?.status !== 'DISCHARGED')

  /**
   * `silent` recarrega sem desmontar a página. Sem isso, cada aferição
   * registrada trocava a tela inteira por "Carregando", perdendo o scroll da
   * timeline que a pessoa estava lendo.
   */
  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!clinicId || !id) return

      if (!silent) setLoading(true)
      setError('')

      try {
        setDetails(await hospitalizationService.getDetails(clinicId, id))
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Não foi possível carregar a internação.'))
      } finally {
        setLoading(false)
      }
    },
    [clinicId, id]
  )

  useEffect(() => {
    void load()
  }, [load])

  const dismissToast = useCallback(() => setToast(null), [])

  async function handleToggleCritical() {
    if (!clinicId || !id || !details) return

    const next = details.status === 'CRITICAL' ? 'ADMITTED' : 'CRITICAL'
    setTogglingStatus(true)

    try {
      await hospitalizationService.updateStatus(clinicId, id, next)
      setToast({
        tone: 'success',
        message:
          next === 'CRITICAL'
            ? `${details.patient?.name ?? 'Paciente'} marcado como crítico.`
            : `${details.patient?.name ?? 'Paciente'} não está mais em estado crítico.`,
      })
      await load({ silent: true })
    } catch (err: unknown) {
      setToast({
        tone: 'error',
        message: getErrorMessage(err, 'Não foi possível alterar o status.'),
      })
    } finally {
      setTogglingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="hospitalization-page">
        <p className="hospitalization-state">
          <LoaderCircle size={16} className="hospitalization-spinner" />
          Carregando internação...
        </p>
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="hospitalization-page">
        <button type="button" className="ghost" onClick={() => navigate('/internacao')}>
          <ArrowLeft size={16} />
          Voltar ao painel
        </button>
        <p className="hospitalization-state hospitalization-state-error" role="alert">
          {error || 'Internação não encontrada.'}
        </p>
      </div>
    )
  }

  const isDischarged = details.status === 'DISCHARGED'
  const patientName = details.patient?.name ?? 'Paciente'

  return (
    <div className="hospitalization-page">
      <button type="button" className="ghost" onClick={() => navigate('/internacao')}>
        <ArrowLeft size={16} />
        Voltar ao painel
      </button>

      <header className="hospitalization-details-header">
        <div>
          <h1>{patientName}</h1>
          <p>
            {details.patient ? getPatientSpeciesLabel(details.patient.species) : '—'} ·{' '}
            {details.bedIdentifier}
          </p>
        </div>

        <span
          className={`hospitalization-badge status-${details.status.toLowerCase()}`}
          data-testid={`hospitalization-status-${details.status.toLowerCase()}`}
        >
          {getHospitalizationStatusLabel(details.status)}
        </span>
      </header>

      <dl className="hospitalization-summary">
        <div>
          <dt>Entrada</dt>
          <dd>{formatDateTime(details.admittedAt)}</dd>
        </div>
        <div>
          <dt>{isDischarged ? 'Permaneceu' : 'Internado há'}</dt>
          <dd>{formatHospitalizationDuration(details.admittedAt, details.dischargedAt, now)}</dd>
        </div>
        <div>
          <dt>Admitido por</dt>
          <dd>{details.admittedByVet?.name ?? '—'}</dd>
        </div>
        {isDischarged && details.dischargedAt && (
          <div>
            <dt>Alta</dt>
            <dd>{formatDateTime(details.dischargedAt)}</dd>
          </div>
        )}
      </dl>

      <section className="hospitalization-block">
        <h2>Motivo da internação</h2>
        <p>{details.reason}</p>
      </section>

      {isDischarged && (
        <section className="hospitalization-block">
          <h2>Orientações pós-alta</h2>
          <p>{details.dischargeNotes || 'Nenhuma orientação registrada.'}</p>
        </section>
      )}

      {!isDischarged && clinicId && id && (
        <HospitalizationEvolutionForm
          clinicId={clinicId}
          hospitalizationId={id}
          onSuccess={() => {
            setToast({ tone: 'success', message: 'Aferição registrada.' })
            void load({ silent: true })
          }}
          onError={(message) => setToast({ tone: 'error', message })}
        />
      )}

      <section className="hospitalization-block">
        <h2>
          <Stethoscope size={16} />
          Evolução clínica
        </h2>

        {details.evolutions.length === 0 ? (
          <p className="hospitalization-state">
            Nenhuma aferição registrada nesta internação.
          </p>
        ) : (
          <ol className="hospitalization-timeline">
            {details.evolutions.map((evolution) => (
              <li key={evolution.id}>
                <div className="hospitalization-timeline-time">
                  <strong>{formatTime(evolution.recordedAt)}</strong>
                  <span>{new Date(evolution.recordedAt).toLocaleDateString('pt-BR')}</span>
                </div>

                <div className="hospitalization-timeline-body">
                  <VitalSigns evolution={evolution} />
                  <p>{evolution.notes}</p>
                  <span className="hospitalization-timeline-author">
                    Registrado por {evolution.recordedByVet?.name ?? '—'}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {!isDischarged && (
        <div className="hospitalization-discharge-bar">
          <button
            type="button"
            className="ghost"
            onClick={() => void handleToggleCritical()}
            disabled={togglingStatus}
          >
            {details.status === 'CRITICAL' ? (
              <>
                <HeartPulse size={16} />
                Marcar como estável
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                Marcar como crítico
              </>
            )}
          </button>

          <button
            type="button"
            className="confirm save"
            onClick={() => setShowDischargeModal(true)}
            disabled={togglingStatus}
          >
            <LogOut size={16} />
            Conceder alta médica
          </button>
        </div>
      )}

      {showDischargeModal && clinicId && id && (
        <DischargePatientModal
          clinicId={clinicId}
          hospitalizationId={id}
          patientName={patientName}
          onClose={() => setShowDischargeModal(false)}
          onSuccess={() => {
            setShowDischargeModal(false)
            setToast({ tone: 'success', message: `Alta concedida para ${patientName}.` })
            void load({ silent: true })
          }}
          onError={(message) => setToast({ tone: 'error', message })}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
