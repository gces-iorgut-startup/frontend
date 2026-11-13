import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, PawPrint, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../lib/errorMessage'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import { portalService } from '../../lib/portalService'
import { useAuthStore } from '../../stores/authStore'
import { TutorVaccineAlertBanner } from '../../components/portal/TutorVaccineAlertBanner'
import { RequestAppointmentModal } from '../../components/portal/RequestAppointmentModal'
import type {
  TutorAlert,
  TutorDashboard,
  TutorPortalClinicalRecord,
  TutorPortalPatientHistory,
} from '../../types'
import '../../styles/portal.css'

const APPOINTMENT_LABELS: Record<string, string> = {
  GENERAL: 'Consulta geral',
  RETURN: 'Retorno',
  SURGICAL_EVALUATION: 'Avaliação cirúrgica',
  VACCINATION: 'Vacinacao',
  OBSERVATION: 'Consulta',
  EXAM: 'Hemograma',
  SURGICAL: 'Cirurgia',
}

const APPOINTMENT_CLASSES: Record<string, string> = {
  GENERAL: 'tutor-appointment-row yellow',
  RETURN: 'tutor-appointment-row cyan',
  SURGICAL_EVALUATION: 'tutor-appointment-row lilac',
  VACCINATION: 'tutor-appointment-row cyan',
  OBSERVATION: 'tutor-appointment-row yellow',
  EXAM: 'tutor-appointment-row lilac',
  SURGICAL: 'tutor-appointment-row pink',
}

function formatDate(value?: string | null) {
  if (!value) return 'Nao informado'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Nao informado'
  return parsed.toLocaleDateString('pt-BR')
}

function formatTime(value?: string | null) {
  if (!value) return '--:--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--:--'
  return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getAge(value?: string | null) {
  if (!value) return 'Nao informado'
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return 'Nao informado'

  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years -= 1
  }

  if (years <= 0) return 'Menos de 1 ano'
  return `${years} anos`
}

function formatWeight(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Nao informado'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 'Nao informado'
  return `${numeric} kg`
}

function getFirstName(fullName?: string | null) {
  if (!fullName) return 'Tutor'
  return fullName.trim().split(' ')[0] || 'Tutor'
}

function buildFallbackAppointments(records: TutorPortalClinicalRecord[]) {
  return records.slice(0, 5).map((record) => ({
    id: record.id,
    dateTime: record.createdAt,
    category: 'OBSERVATION',
  }))
}

function buildCareItems(
  selectedPetId: string,
  selectedPetName: string,
  dashboard: TutorDashboard,
  alerts: TutorAlert[],
) {
  const now = Date.now()

  const nextAppointment = dashboard.recentAppointments
    .filter((item) => item.patientId === selectedPetId)
    .filter((item) => new Date(item.dateTime).getTime() >= now)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0]

  const nextAppointmentText = nextAppointment
    ? `Proxima consulta agendada: ${formatDate(nextAppointment.dateTime)} as ${formatTime(nextAppointment.dateTime)} com Dr(a). ${nextAppointment.vet?.name || 'responsavel'}.`
    : 'Nenhuma consulta agendada para os proximos dias.'

  const nextVaccine = dashboard.upcomingVaccinations
    .filter((item) => item.patientId === selectedPetId)
    .sort((a, b) => new Date(a.nextDoseAt ?? '').getTime() - new Date(b.nextDoseAt ?? '').getTime())[0]

  const vaccineText = nextVaccine
    ? `Vacinas em atencao: ${nextVaccine.vaccineName} vence em ${formatDate(nextVaccine.nextDoseAt)}.`
    : 'Vacinas em atencao: sem pendencias no momento.'

  const recommendation = alerts.find(
    (item) => item.type === 'vet_recommendation' && item.patientName === selectedPetName,
  )

  const recommendationText = recommendation
    ? `Recomendacoes atuais: ${recommendation.message}`
    : 'Recomendacoes atuais: acompanhar rotina de cuidados conforme orientacao veterinaria.'

  return [nextAppointmentText, vaccineText, recommendationText]
}

export function TutorPortalHomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [loading, setLoading] = useState(true)
  const [loadingPet, setLoadingPet] = useState(false)
  const [error, setError] = useState('')

  const [dashboard, setDashboard] = useState<TutorDashboard | null>(null)
  const [alerts, setAlerts] = useState<TutorAlert[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [selectedHistory, setSelectedHistory] = useState<TutorPortalPatientHistory | null>(null)
  const [petTransitionDirection, setPetTransitionDirection] = useState<'next' | 'prev'>('next')

  const [selectedAlertForRequest, setSelectedAlertForRequest] = useState<TutorAlert | null>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)

  function handleRequestAppointmentFromAlert(alert: TutorAlert) {
    setSelectedAlertForRequest(alert)
    setIsRequestModalOpen(true)
  }

  useEffect(() => {
    let cancelled = false

    async function loadPortal() {
      setLoading(true)
      setError('')

      try {
        const [dashboardResponse, alertsResponse] = await Promise.all([
          portalService.getDashboard(),
          portalService.getAlerts(),
        ])

        if (cancelled) return

        setDashboard(dashboardResponse)
        setAlerts(alertsResponse)

        if (dashboardResponse.pets.length > 0) {
          setSelectedPetId((current) => current || dashboardResponse.pets[0].id)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Nao foi possivel carregar os dados do portal. Tente novamente.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPortal()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedPetId) return

    let cancelled = false

    async function loadSelectedPet() {
      setLoadingPet(true)
      try {
        const response = await portalService.getPatientHistory(selectedPetId)
        if (!cancelled) setSelectedHistory(response)
      } catch {
        if (!cancelled) setSelectedHistory(null)
      } finally {
        if (!cancelled) setLoadingPet(false)
      }
    }

    void loadSelectedPet()

    return () => {
      cancelled = true
    }
  }, [selectedPetId])

  const selectedPetName = useMemo(() => {
    if (!dashboard) return ''
    return dashboard.pets.find((pet) => pet.id === selectedPetId)?.name || ''
  }, [dashboard, selectedPetId])

  const selectedPetIndex = useMemo(() => {
    if (!dashboard) return -1
    return dashboard.pets.findIndex((pet) => pet.id === selectedPetId)
  }, [dashboard, selectedPetId])

  const appointmentRows = useMemo(() => {
    if (!dashboard) return []

    const petAppointments = dashboard.recentAppointments.filter(
      (appointment) => appointment.patientId === selectedPetId,
    )

    const source = petAppointments.length > 0
      ? petAppointments
      : dashboard.recentAppointments

    if (source.length > 0) {
      return source.slice(0, 5)
    }

    return buildFallbackAppointments(selectedHistory?.clinicalRecords ?? [])
  }, [dashboard, selectedHistory, selectedPetId])

  const careItems = useMemo(() => {
    if (!dashboard || !selectedPetId) {
      return [
        'Nenhuma consulta agendada para os proximos dias.',
        'Vacinas em atencao: sem pendencias no momento.',
        'Recomendacoes atuais: acompanhe as orientacoes do veterinario.',
      ]
    }

    return buildCareItems(selectedPetId, selectedPetName, dashboard, alerts)
  }, [dashboard, alerts, selectedPetId, selectedPetName])

  function handleSwitchPet(direction: 'next' | 'prev') {
    if (!dashboard || dashboard.pets.length <= 1 || selectedPetIndex < 0) return

    const delta = direction === 'next' ? 1 : -1
    const nextIndex = (selectedPetIndex + delta + dashboard.pets.length) % dashboard.pets.length

    setPetTransitionDirection(direction)
    setSelectedPetId(dashboard.pets[nextIndex].id)
  }

  if (loading) {
    return <div className="tutor-portal-state">Carregando portal do tutor...</div>
  }

  if (error) {
    return <div className="tutor-portal-state">{error}</div>
  }

  if (!dashboard || dashboard.pets.length === 0) {
    return <div className="tutor-portal-state">Nenhum pet vinculado a sua conta.</div>
  }

  return (
    <div className="tutor-home-page">
      <header className="tutor-home-header">
        <h1>Ola {getFirstName(user?.name)}!</h1>
      </header>

      <TutorVaccineAlertBanner
        alerts={alerts}
        onRequestAppointment={handleRequestAppointmentFromAlert}
      />

      <div className="tutor-home-grid">
        <section className="tutor-main-column">
          <article className="tutor-card tutor-pet-card">
            <div className="tutor-pet-header">
              <h2>
                <PawPrint size={21} />
                Meu Pet
              </h2>

              <div className="tutor-pet-switcher" aria-label="Navegacao de pets">
                <button
                  type="button"
                  className="tutor-pet-switch-btn"
                  onClick={() => handleSwitchPet('prev')}
                  disabled={dashboard.pets.length <= 1}
                  aria-label="Pet anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="tutor-pet-switch-pill" role="status" aria-live="polite">
                  <span>{selectedPetName || 'Meu pet'}</span>
                  <small>
                    {Math.max(selectedPetIndex + 1, 1)}/{dashboard.pets.length}
                  </small>
                </div>

                <button
                  type="button"
                  className="tutor-pet-switch-btn"
                  onClick={() => handleSwitchPet('next')}
                  disabled={dashboard.pets.length <= 1}
                  aria-label="Proximo pet"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {loadingPet || !selectedHistory ? (
              <div className="tutor-card-empty">Carregando dados do pet...</div>
            ) : (
              <div
                key={selectedPetId}
                className={`tutor-pet-content ${
                  petTransitionDirection === 'next' ? 'slide-next' : 'slide-prev'
                }`}
              >
                <div className="tutor-pet-photo">
                  {selectedHistory.patient.photoUrl ? (
                    <img src={selectedHistory.patient.photoUrl} alt={selectedHistory.patient.name} />
                  ) : (
                    <PawPrint size={46} />
                  )}
                </div>

                <div className="tutor-pet-table">
                  <div><span>Nome do Pet:</span><strong>{selectedHistory.patient.name}</strong></div>
                  <div><span>Data de nascimento:</span><strong>{formatDate(selectedHistory.patient.birthDate)}</strong></div>
                  <div><span>Idade:</span><strong>{getAge(selectedHistory.patient.birthDate)}</strong></div>
                  <div><span>Especie:</span><strong>{getPatientSpeciesLabel(selectedHistory.patient.species)}</strong></div>
                  <div><span>Raca:</span><strong>{selectedHistory.patient.breed || 'Nao informado'}</strong></div>
                  <div><span>Sexo:</span><strong>{selectedHistory.patient.sex || 'Nao informado'}</strong></div>
                  <div><span>Peso atual:</span><strong>{formatWeight(selectedHistory.patient.weightKg)}</strong></div>
                  <div><span>Microchip:</span><strong>{selectedHistory.patient.microchip || 'Nao possui'}</strong></div>
                </div>
              </div>
            )}
          </article>

          <article className="tutor-card tutor-appointments-card">
            <div className="tutor-card-head">
              <h2>Atendimentos</h2>
              <button
                type="button"
                className="tutor-see-more"
                onClick={() => navigate('/portal/historico')}
              >
                <Plus size={16} />
                Ver mais
              </button>
            </div>

            <div className="tutor-appointments-list">
              {appointmentRows.length > 0 ? (
                appointmentRows.map((appointment) => {
                  const rowClass = APPOINTMENT_CLASSES[appointment.category || 'OBSERVATION'] || 'tutor-appointment-row'
                  return (
                    <div key={appointment.id} className={rowClass}>
                      <span>Data: <strong>{formatDate(appointment.dateTime)}</strong></span>
                      <span>Horario: <strong>{formatTime(appointment.dateTime)}</strong></span>
                      <span>Atendimento: <strong>{APPOINTMENT_LABELS[appointment.category || 'OBSERVATION'] || 'Consulta'}</strong></span>
                    </div>
                  )
                })
              ) : (
                <div className="tutor-card-empty">Nenhum atendimento recente encontrado.</div>
              )}
            </div>
          </article>
        </section>

        <aside className="tutor-care-column">
          <article className="tutor-card tutor-care-card">
            <h2>
              <span className="tutor-care-icon">
                <PawPrint size={14} />
              </span>
              Iougurt Care
            </h2>

            <p>Ola! Aqui estao as proximas informacoes importantes sobre o seu pet:</p>

            <ul>
              {careItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </aside>
      </div>

      {isRequestModalOpen && selectedAlertForRequest && (
        <RequestAppointmentModal
          isOpen={isRequestModalOpen}
          patientId={selectedAlertForRequest.patientId || selectedPetId}
          patientName={selectedAlertForRequest.patientName}
          vaccineName={selectedAlertForRequest.vaccineName}
          initialCategory="VACCINATION"
          onClose={() => {
            setIsRequestModalOpen(false)
            setSelectedAlertForRequest(null)
          }}
          onSuccess={() => {
            setIsRequestModalOpen(false)
            setSelectedAlertForRequest(null)
          }}
        />
      )}
    </div>
  )
}
