import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, LoaderCircle, Plus, RefreshCw } from 'lucide-react'
import { hospitalizationService } from '../../lib/hospitalizationService'
import { getErrorMessage } from '../../lib/errorMessage'
import {
  formatDateTime,
  formatHospitalizationDuration,
  getHospitalizationStatusLabel,
} from '../../lib/hospitalizationFields'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import { resolveUploadUrl } from '../../lib/uploadUrl'
import { useNow } from '../../lib/useNow'
import { useAuthStore } from '../../stores/authStore'
import { AdmitPatientModal } from '../../components/AdmitPatientModal'
import { Toast, type ToastState } from '../../components/common/Toast'
import type { Hospitalization } from '../../types'
import '../../styles/hospitalization.css'

export function HospitalizationDashboard() {
  const clinicId = useAuthStore((state) => state.user?.clinicId)
  const navigate = useNavigate()

  const [hospitalizations, setHospitalizations] = useState<Hospitalization[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showAdmitModal, setShowAdmitModal] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Relógio para o tempo de internação avançar sem recarregar a página.
  const now = useNow()

  /**
   * `silent` recarrega sem trocar a tela por "Carregando". Depois de admitir
   * um paciente, desmontar a grade toda perderia o scroll e piscaria sem
   * necessidade — os dados já estão na tela, só precisam ser atualizados.
   */
  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!clinicId) return

      if (silent) setRefreshing(true)
      else setLoading(true)
      setError('')

      try {
        setHospitalizations(await hospitalizationService.listActive(clinicId))
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Não foi possível carregar as internações.'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [clinicId]
  )

  useEffect(() => {
    void load()
  }, [load])

  const dismissToast = useCallback(() => setToast(null), [])

  // A sessão sempre traz a clínica; esta guarda existe porque `clinicId` é
  // opcional no tipo `User` e um estado quebrado não deve virar tela em branco.
  if (!clinicId) {
    return (
      <div className="hospitalization-page">
        <p className="hospitalization-state">
          Não foi possível identificar a clínica da sua sessão. Entre novamente.
        </p>
      </div>
    )
  }

  return (
    <div className="hospitalization-page">
      <header className="hospitalization-header">
        <div>
          <h1>
            <BedDouble size={22} />
            Internação
          </h1>
          <p>
            {loading
              ? 'Carregando leitos...'
              : `${hospitalizations.length} ${
                  hospitalizations.length === 1 ? 'leito ocupado' : 'leitos ocupados'
                }`}
          </p>
        </div>

        <div className="hospitalization-header-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => void load({ silent: true })}
            disabled={loading || refreshing}
            aria-label="Atualizar painel"
          >
            <RefreshCw size={16} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button
            type="button"
            className="confirm save"
            onClick={() => setShowAdmitModal(true)}
          >
            <Plus size={16} />
            Admitir paciente
          </button>
        </div>
      </header>

      {error && (
        <p className="hospitalization-state hospitalization-state-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="hospitalization-state">
          <LoaderCircle size={16} className="hospitalization-spinner" />
          Carregando internações...
        </p>
      ) : hospitalizations.length === 0 && !error ? (
        <div className="hospitalization-empty">
          <BedDouble size={32} />
          <p>Nenhum paciente internado neste momento.</p>
          <span>Use &ldquo;Admitir paciente&rdquo; para ocupar um leito.</span>
        </div>
      ) : (
        <ul className="hospitalization-grid">
          {hospitalizations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="hospitalization-card"
                onClick={() => navigate(`/internacao/${item.id}`)}
              >
                <div className="hospitalization-card-head">
                  {item.patient?.photoUrl ? (
                    <img
                      src={resolveUploadUrl(item.patient.photoUrl)}
                      alt={item.patient.name}
                      className="hospitalization-card-photo"
                    />
                  ) : (
                    <span className="hospitalization-card-photo placeholder" aria-hidden="true">
                      {item.patient?.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}

                  <div className="hospitalization-card-identity">
                    <strong>{item.patient?.name ?? 'Paciente'}</strong>
                    <span>
                      {item.patient ? getPatientSpeciesLabel(item.patient.species) : '—'}
                    </span>
                  </div>

                  <span
                    className={`hospitalization-badge status-${item.status.toLowerCase()}`}
                    data-testid={`hospitalization-status-${item.status.toLowerCase()}`}
                  >
                    {getHospitalizationStatusLabel(item.status)}
                  </span>
                </div>

                <dl className="hospitalization-card-facts">
                  <div>
                    <dt>Leito</dt>
                    <dd>{item.bedIdentifier}</dd>
                  </div>
                  <div>
                    <dt>Entrada</dt>
                    <dd>{formatDateTime(item.admittedAt)}</dd>
                  </div>
                  <div>
                    <dt>Internado há</dt>
                    <dd>
                      {formatHospitalizationDuration(item.admittedAt, item.dischargedAt, now)}
                    </dd>
                  </div>
                </dl>

                <p className="hospitalization-card-reason">{item.reason}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAdmitModal && (
        <AdmitPatientModal
          clinicId={clinicId}
          admittedPatientIds={hospitalizations.map((item) => item.patientId)}
          onClose={() => setShowAdmitModal(false)}
          onSuccess={(hospitalization) => {
            setShowAdmitModal(false)
            setToast({
              tone: 'success',
              message: `${hospitalization.patient?.name ?? 'Paciente'} admitido em ${
                hospitalization.bedIdentifier
              }.`,
            })
            void load({ silent: true })
          }}
          onError={(message) => setToast({ tone: 'error', message })}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
