import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoaderCircle, Plus } from 'lucide-react'
import '../../styles/home.css'

import { AppointmentsService } from '../../services/appointments.service'
import { historyService } from '../../lib/historyService'
import {
  APPOINTMENT_CATEGORY_LABELS,
  HOME_AGENDA_CATEGORY_COLOR_CLASS,
} from '../../lib/appointmentCategory'
import { getPatientSpeciesLabel } from '../../lib/patientFields'

import type { Appointment, ClinicHistoryListItem } from '../../types'

const CATEGORY_COLORS_APP: Record<string, string> = {
  GENERAL: 'appointment-card--yellow',
  RETURN: 'appointment-card--cyan',
  SURGICAL_EVALUATION: 'appointment-card--pink',
  VACCINATION: 'appointment-card--cyan',
  OBSERVATION: 'appointment-card--yellow',
  EXAM: 'appointment-card--purple',
  SURGICAL: 'appointment-card--pink',
}

function formatDateBR(isoString: string) {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return '—'

  const dateStr = d.toLocaleDateString('pt-BR')
  const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')

  return `${dateStr}, ${timeStr}`
}

function formatTimeOnly(isoString: string) {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return '--:--'
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

export function HomePage() {
  const navigate = useNavigate()

  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingAgenda, setLoadingAgenda] = useState(true)

  const [latestAppointments, setLatestAppointments] = useState<ClinicHistoryListItem[]>([])
  const [agenda, setAgenda] = useState<Appointment[]>([])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      // Fetch Latest Appointments
      try {
        const historyData = await historyService.getClinicHistory()
        if (!cancelled) {
          setLatestAppointments(historyData.slice(0, 8)) // Get max 8 for dashboard
        }
      } catch (err) {
        console.error('Failed to load history', err)
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }

      // Fetch Today's Agenda
      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const agendaData = await AppointmentsService.listByDay(todayStr)
        if (!cancelled) {
          // Sort by time
          const sorted = [...agendaData].sort(
            (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
          )
          setAgenda(sorted)
        }
      } catch (err) {
        console.error('Failed to load agenda', err)
      } finally {
        if (!cancelled) setLoadingAgenda(false)
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="home-dashboard">
      {/* Coluna 1: Últimos atendimentos */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>Últimos atendimentos</h2>
          <button className="home-btn-more" onClick={() => navigate('/historico')}>
            <Plus size={16} /> Ver mais
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-primary)' }}>
            <LoaderCircle className="care-spin" size={32} />
          </div>
        ) : latestAppointments.length === 0 ? (
          <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Nenhum atendimento finalizado registrado.
          </div>
        ) : (
          <div className="appointments-list">
            {latestAppointments.map((app) => {
              const category = app.record?.appointment?.category || 'OBSERVATION'
              const colorClass = CATEGORY_COLORS_APP[category] || 'appointment-card--green'
              const typeLabel = APPOINTMENT_CATEGORY_LABELS[category] || 'Consulta'

              return (
                <div key={app.id} className={`appointment-card ${colorClass}`}>
                  {/* Coluna 1: Avatar + Name */}
                  <div className="app-pet-profile">
                    {app.patient?.photoUrl ? (
                      <div className="app-card-avatar">
                        <img src={app.patient.photoUrl} alt={app.patientName} />
                      </div>
                    ) : (
                      <div className="app-card-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        {app.patientName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="app-pet-name">{app.patientName}</span>
                  </div>

                  {/* Coluna 2: Date + Tutor */}
                  <div className="app-card-col">
                    <div className="app-info-row">
                      <span className="app-info-label">Atendido em:</span>
                      <span>{formatDateBR(app.date)}</span>
                    </div>
                    <div className="app-info-row">
                      <span className="app-info-label">Tutor:</span>
                      <span>{app.tutorName}</span>
                    </div>
                  </div>

                  {/* Coluna 3: Specie + Type */}
                  <div className="app-card-col">
                    <div className="app-info-row">
                      <span className="app-info-label">Espécie:</span>
                      <span>{getPatientSpeciesLabel(app.species)}</span>
                    </div>
                    <div className="app-info-row">
                      <span className="app-info-label">Atendimento:</span>
                      <span>{typeLabel}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Coluna 2: Agenda do dia */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>Agenda do dia</h2>
          <button className="home-btn-more" onClick={() => navigate('/agenda')}>
            <Plus size={16} /> Ver mais
          </button>
        </div>

        {loadingAgenda ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-primary)' }}>
            <LoaderCircle className="care-spin" size={32} />
          </div>
        ) : agenda.length === 0 ? (
          <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Nenhum agendamento para hoje.
          </div>
        ) : (
          <div className="timeline-list">
            {agenda.map((item) => {
              const category = item.category || 'OBSERVATION'
              const colorClass = HOME_AGENDA_CATEGORY_COLOR_CLASS[category] || 'category-gray'
              const typeLabel = APPOINTMENT_CATEGORY_LABELS[category] || 'Consulta'

              return (
                <div key={item.id} className="timeline-item">
                  <div className="timeline-time">{formatTimeOnly(item.dateTime)}</div>
                  
                  <div className={`timeline-card ${colorClass}`}>
                    <div className="timeline-card-header">
                      {item.patient?.photoUrl ? (
                         <div className="timeline-avatar">
                           <img src={item.patient.photoUrl} alt={item.patient?.name} />
                         </div>
                      ) : (
                         <div className="timeline-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', color: 'var(--gray-800)', fontSize: '14px', fontWeight: 600 }}>
                           {item.patient?.name?.charAt(0).toUpperCase() || '?'}
                         </div>
                      )}
                      <span className="timeline-pet-name">{item.patient?.name || 'Paciente'}</span>
                    </div>
                    
                    <div className="app-card-col">
                      <div className="timeline-info-row">
                        <span className="timeline-info-label">Atendimento:</span>
                        <span>{typeLabel}</span>
                      </div>
                      <div className="timeline-info-row">
                        <span className="timeline-info-label">Espécie:</span>
                        <span>{getPatientSpeciesLabel(item.patient?.species)}</span>
                      </div>
                      <div className="timeline-info-row">
                         <span className="timeline-info-label">Veterinário:</span>
                         <span>{item.vet?.name || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
