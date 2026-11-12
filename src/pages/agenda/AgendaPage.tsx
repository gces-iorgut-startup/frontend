import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardPlus } from 'lucide-react'
import { ScheduleModal } from '../../components/scheduling/ScheduleModal'
import {
  APPOINTMENT_CATEGORY_OPTIONS,
  APPOINTMENT_CATEGORY_LABELS,
  HOME_AGENDA_CATEGORY_COLOR_CLASS,
} from '../../lib/appointmentCategory'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import { useAgendaStore } from '../../stores/useAgendaStore'
import type { Appointment, AppointmentCategory, AppointmentStatus } from '../../types'
import '../../styles/agenda.css'

const START_HOUR = 7
const END_HOUR = 18
const ROW_DESKTOP = 70
const ROW_MOBILE = 40

const mq = window.matchMedia('(max-width: 768px)')

function subscribeMQ(cb: () => void) {
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function useIsMobile() {
  return useSyncExternalStore(subscribeMQ, () => mq.matches)
}

const HOURS_GRID = Array.from(
  { length: (END_HOUR - START_HOUR) * 4 },
  (_, i) => {
    const h = START_HOUR + Math.floor(i / 4)
    const m = String((i % 4) * 15).padStart(2, '0')
    return `${String(h).padStart(2, '0')}:${m}`
  },
)

interface LayoutSlot {
  appt: Appointment
  startIdx: number
  endIdx: number
  col: number
  totalCols: number
}

function computeOverlapLayout(appointments: Appointment[], gridLength: number): LayoutSlot[] {
  const items = appointments
    .map((appt) => {
      const startIdx = getGridIndex(appt.dateTime)
      const span = getSlotSpan(appt.dateTime, appt.endDateTime)
      const endIdx = startIdx + span
      return { appt, startIdx, endIdx }
    })
    .filter((item) => item.startIdx >= 0 && item.startIdx < gridLength)
    .sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx)

  const result: LayoutSlot[] = []

  const groups: typeof items[] = []
  let currentGroup: typeof items = []
  let groupEnd = -1

  for (const item of items) {
    if (currentGroup.length === 0 || item.startIdx < groupEnd) {
      currentGroup.push(item)
      groupEnd = Math.max(groupEnd, item.endIdx)
    } else {
      groups.push(currentGroup)
      currentGroup = [item]
      groupEnd = item.endIdx
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  for (const group of groups) {
    const columns: number[] = []
    for (const item of group) {
      let col = 0
      while (columns[col] !== undefined && columns[col] > item.startIdx) col++
      columns[col] = item.endIdx
      result.push({ ...item, col, totalCols: 0 })
    }
    const totalCols = columns.length
    for (let i = result.length - group.length; i < result.length; i++) {
      result[i].totalCols = totalCols
    }
  }

  return result
}

function getGridIndex(dateTime: string): number {
  const d = new Date(dateTime)
  return (d.getHours() - START_HOUR) * 4 + Math.floor(d.getMinutes() / 15)
}

function getSlotSpan(startDateTime: string, endDateTime?: string | null): number {
  if (!endDateTime) return 1
  const startMs = new Date(startDateTime).getTime()
  const endMs = new Date(endDateTime).getTime()
  const slots = Math.round((endMs - startMs) / (15 * 60 * 1000))
  return Math.max(slots, 1)
}

function formatTime(dateTime: string): string {
  const d = new Date(dateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatTimeRange(start: string, end?: string | null): string {
  const startStr = formatTime(start)
  if (!end) return startStr
  return `${startStr} - ${formatTime(end)}`
}

function getNextTimeSlot(time: string): string {
  const idx = TIME_SLOTS.indexOf(time)
  if (idx < 0 || idx >= TIME_SLOTS.length - 1) return ''
  return TIME_SLOTS[idx + 1]
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

function getAppointmentColorClass(appointment: Appointment): string {
  return HOME_AGENDA_CATEGORY_COLOR_CLASS[appointment.category] ?? 'category-gray'
}

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`agenda-status-badge status-${status.toLowerCase().replace('_', '-')}`}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  )
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function MobileCardList({
  appointments,
  onSelect,
}: {
  appointments: Appointment[]
  onSelect: (appointment: Appointment) => void
}) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
  )

  if (sorted.length === 0) {
    return <div className="agenda-mobile-empty">Nenhum agendamento para este dia.</div>
  }

  return (
      <div className="agenda-mobile-list">
      {sorted.map((appt) => {
        const colorClass = getAppointmentColorClass(appt)
        return (
          <button
            key={appt.id}
            type="button"
            className={`agenda-mobile-card ${colorClass}`}
            onClick={() => onSelect(appt)}
          >
            <div className="agenda-mobile-card-time">{formatTimeRange(appt.dateTime, appt.endDateTime)}</div>
            <div className="agenda-mobile-card-body">
              <span className="agenda-mobile-card-pet">{appt.patient?.name ?? 'Paciente'}</span>
              <span className="agenda-mobile-card-info">
                {APPOINTMENT_CATEGORY_LABELS[appt.category] ?? appt.category}
                {appt.vet?.name ? ` · ${appt.vet.name}` : ''}
              </span>
              <AppointmentStatusBadge status={appt.status} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

const TIME_SLOTS = [
  '07:00', '07:15', '07:30', '07:45',
  '08:00', '08:15', '08:30', '08:45',
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
  '17:00', '17:15', '17:30', '17:45',
]

function getActionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message
  return fallback
}

export function AgendaPage() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('Agendamento realizado com sucesso')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const isMobile = useIsMobile()
  const rowH = isMobile ? ROW_MOBILE : ROW_DESKTOP

  // Sub-modal state
  const [modalView, setModalView] = useState<'actions' | 'cancel' | 'reschedule' | 'edit'>('actions')
  const [cancelReason, setCancelReason] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleStart, setRescheduleStart] = useState('')
  const [rescheduleEnd, setRescheduleEnd] = useState('')
  const [editCategory, setEditCategory] = useState<AppointmentCategory>('GENERAL')
  const [editObservation, setEditObservation] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const { selectedDate, appointments, isLoading, setDate, fetchAppointments, cancelAppointment, rescheduleAppointment, updateAppointment } =
    useAgendaStore()

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const resetModalState = () => {
    setSelectedAppointment(null)
    setModalView('actions')
    setCancelReason('')
    setRescheduleDate('')
    setRescheduleStart('')
    setRescheduleEnd('')
    setEditCategory('GENERAL')
    setEditObservation('')
    setActionLoading(false)
    setActionError('')
  }

  const showSuccessToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const handleSuccess = () => {
    showSuccessToast('Agendamento realizado com sucesso')
  }

  const handleStartCare = () => {
    if (!selectedAppointment) return
    navigate(`/atendimentos/${selectedAppointment.id}/pacientes/${selectedAppointment.patientId}`)
  }

  const handleOpenReschedule = () => {
    if (!selectedAppointment) return
    if (selectedAppointment.status !== 'SCHEDULED') {
      setActionError('Só é possível reagendar agendamentos com status SCHEDULED.')
      return
    }

    const d = new Date(selectedAppointment.dateTime)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const start = formatTime(selectedAppointment.dateTime)
    const currentEnd = selectedAppointment.endDateTime
      ? formatTime(selectedAppointment.endDateTime)
      : ''
    const defaultEnd = currentEnd && currentEnd > start ? currentEnd : getNextTimeSlot(start)

    setRescheduleDate(`${year}-${month}-${day}`)
    setRescheduleStart(start)
    setRescheduleEnd(defaultEnd)
    setModalView('reschedule')
    setActionError('')
  }

  const handleOpenEdit = () => {
    if (!selectedAppointment) return
    if (selectedAppointment.status !== 'SCHEDULED') {
      setActionError('Somente atendimentos agendados podem ser editados.')
      return
    }

    setEditCategory(selectedAppointment.category)
    setEditObservation(selectedAppointment.observation ?? '')
    setModalView('edit')
    setActionError('')
  }

  const handleConfirmEdit = async () => {
    if (!selectedAppointment) return

    setActionLoading(true)
    setActionError('')
    try {
      await updateAppointment(selectedAppointment.id, {
        category: editCategory,
        observation: editObservation.trim() || null,
      })
      resetModalState()
      showSuccessToast('Atendimento atualizado com sucesso')
    } catch (err: unknown) {
      setActionError(getActionErrorMessage(err, 'Erro ao editar atendimento.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return
    if (selectedAppointment.status !== 'SCHEDULED') {
      setActionError('Só é possível cancelar agendamentos com status SCHEDULED.')
      return
    }

    if (!cancelReason.trim()) {
      setActionError('A justificativa é obrigatória para cancelar.')
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      await cancelAppointment(selectedAppointment.id, cancelReason.trim())
      resetModalState()
      showSuccessToast('Agendamento cancelado com sucesso')
    } catch (err: unknown) {
      setActionError(getActionErrorMessage(err, 'Erro ao cancelar agendamento.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmReschedule = async () => {
    if (!selectedAppointment) return
    if (!rescheduleDate || !rescheduleStart || !rescheduleEnd) {
      setActionError('Preencha data, horário de início e horário de fim.')
      return
    }
    if (rescheduleEnd <= rescheduleStart) {
      setActionError('O horário de fim deve ser posterior ao horário de início.')
      return
    }

    setActionLoading(true)
    setActionError('')
    try {
      const newStartDate = new Date(`${rescheduleDate}T${rescheduleStart}:00`)
      const newEndDate = new Date(`${rescheduleDate}T${rescheduleEnd}:00`)

      if (Number.isNaN(newStartDate.getTime()) || Number.isNaN(newEndDate.getTime())) {
        setActionError('Data ou horário inválido para reagendamento.')
        return
      }

      if (newStartDate <= new Date()) {
        setActionError('A nova data deve ser no futuro.')
        return
      }

      if (newEndDate <= newStartDate) {
        setActionError('O horário de fim deve ser posterior ao horário de início.')
        return
      }

      const newDateTime = newStartDate.toISOString()
      const newEndDateTime = newEndDate.toISOString()
      await rescheduleAppointment(selectedAppointment.id, newDateTime, newEndDateTime)
      resetModalState()
      showSuccessToast('Agendamento reagendado com sucesso')
    } catch (err: unknown) {
      setActionError(getActionErrorMessage(err, 'Erro ao reagendar.'))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="agenda-container">
      <div className="agenda-header">
        <h1>Agendamentos</h1>

        <div className="agenda-controls">
          <div className="agenda-date-picker">
            <span
              className="agenda-date-arrow"
              onClick={() => setDate(shiftDate(selectedDate, -1))}
            >
              &lt;
            </span>
            <span>{formatDateBR(selectedDate)}</span>
            <span
              className="agenda-date-arrow"
              onClick={() => setDate(shiftDate(selectedDate, 1))}
            >
              &gt;
            </span>
          </div>

          <button className="btn-agendar-header" onClick={() => setIsModalOpen(true)}>
            + Agendar
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
          Carregando agendamentos…
        </div>
      )}

      {isMobile ? (
        <MobileCardList appointments={appointments} onSelect={setSelectedAppointment} />
      ) : (
        <div className="agenda-schedule-container">
          {HOURS_GRID.map((hour) => (
            <div
              key={hour}
              className="agenda-grid-row"
              style={{ height: `${rowH}px` }}
            >
              <span className="agenda-time">{hour}</span>
              <div className="agenda-line"></div>
            </div>
          ))}

          <div className="agenda-events">
            {computeOverlapLayout(appointments, HOURS_GRID.length).map(
              ({ appt, startIdx, col, totalCols }) => {
                const span = getSlotSpan(appt.dateTime, appt.endDateTime)
                const colorClass = getAppointmentColorClass(appt)
                const cardHeight = rowH * span - 4
                const gapPx = 3
                const pctWidth = 100 / totalCols
                const leftPct = col * pctWidth
                const widthCalc = `calc(${pctWidth}% - ${gapPx}px)`

                return (
                  <div
                    key={appt.id}
                    className={`agenda-card ${colorClass}`}
                    style={{
                      top: `${startIdx * rowH + 2}px`,
                      height: `${cardHeight}px`,
                      left: `calc(${leftPct}% + ${col > 0 ? gapPx : 0}px)`,
                      width: widthCalc,
                      right: 'auto',
                    }}
                    onClick={() => setSelectedAppointment(appt)}
                  >
                    <div className="agenda-card-header">
                      {appt.patient?.photoUrl ? (
                        <img
                          src={appt.patient.photoUrl}
                          alt={appt.patient?.name}
                          className="pet-avatar"
                        />
                      ) : (
                        <div className="pet-avatar pet-avatar-placeholder">
                          {appt.patient?.name?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <span className="pet-name">{appt.patient?.name ?? 'Paciente'}</span>
                      <span className="agenda-card-time">
                        {formatTimeRange(appt.dateTime, appt.endDateTime)}
                      </span>
                    </div>

                    <div className="agenda-card-details">
                      <div className="detail-line">
                        <span className="detail-label">Atendimento:</span>
                        <span className="detail-value">
                          {APPOINTMENT_CATEGORY_LABELS[appt.category] ?? appt.category}
                        </span>
                      </div>
                      <div className="detail-line">
                        <span className="detail-label">Veterinário:</span>
                        <span className="detail-value">{appt.vet?.name ?? '—'}</span>
                      </div>
                      <div className="detail-line">
                        <span className="detail-label">Espécie:</span>
                        <span className="detail-value">{getPatientSpeciesLabel(appt.patient?.species)}</span>
                      </div>
                      <div className="detail-line">
                        <span className="detail-label">Status:</span>
                        <AppointmentStatusBadge status={appt.status} />
                      </div>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        </div>
      )}

      {showToast && (
        <div className="custom-toast-success">
          <div className="toast-content-wrapper">
            <div className="toast-icon-circle">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span>{toastMessage}</span>
          </div>
          <button className="toast-close-btn" onClick={() => setShowToast(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* ── Modal de ações do agendamento ──────────── */}
      {selectedAppointment && (
        <div className="agenda-confirm-overlay" role="presentation" onClick={resetModalState}>
          <div className="agenda-confirm-modal agenda-detail-modal" onClick={(e) => e.stopPropagation()}>

            {/* === Tela principal: Ações === */}
            {modalView === 'actions' && (
              <>
                <ClipboardPlus className="agenda-confirm-icon" />
                <h2>{selectedAppointment.patient?.name ?? 'Paciente'}</h2>
                <p className="agenda-detail-sub">
                  {APPOINTMENT_CATEGORY_LABELS[selectedAppointment.category] ?? selectedAppointment.category}
                  {' · '}
                  {formatTimeRange(selectedAppointment.dateTime, selectedAppointment.endDateTime)}
                </p>
                <div className="agenda-detail-status">
                  <AppointmentStatusBadge status={selectedAppointment.status} />
                </div>

                <div className="agenda-action-buttons">
                  <button type="button" className="agenda-action-btn agenda-action-atender" onClick={handleStartCare}>
                    Iniciar Atendimento
                  </button>
                  <button
                    type="button"
                    className="agenda-action-btn agenda-action-editar"
                    onClick={handleOpenEdit}
                    disabled={selectedAppointment.status !== 'SCHEDULED'}
                  >
                    Editar Atendimento
                  </button>
                  <button
                    type="button"
                    className="agenda-action-btn agenda-action-reagendar"
                    onClick={handleOpenReschedule}
                    disabled={selectedAppointment.status !== 'SCHEDULED'}
                    title={selectedAppointment.status !== 'SCHEDULED' ? 'Somente agendamentos com status SCHEDULED podem ser reagendados.' : undefined}
                  >
                    Reagendar
                  </button>
                  <button
                    type="button"
                    className="agenda-action-btn agenda-action-cancelar"
                    onClick={() => {
                      if (selectedAppointment.status !== 'SCHEDULED') {
                        setActionError('Só é possível cancelar agendamentos com status SCHEDULED.')
                        return
                      }
                      setModalView('cancel')
                      setActionError('')
                    }}
                    disabled={selectedAppointment.status !== 'SCHEDULED'}
                    title={selectedAppointment.status !== 'SCHEDULED' ? 'Somente agendamentos com status SCHEDULED podem ser cancelados.' : undefined}
                  >
                    Cancelar Agendamento
                  </button>
                </div>

                {actionError && (
                  <span className="agenda-form-error">{actionError}</span>
                )}

                <button type="button" className="agenda-action-fechar" onClick={resetModalState}>
                  Fechar
                </button>
              </>
            )}

            {modalView === 'edit' && (
              <>
                <h2>Editar Atendimento</h2>
                <p className="agenda-detail-sub">{selectedAppointment.patient?.name}</p>

                <div className="agenda-form-group">
                  <label className="agenda-form-label" htmlFor="edit-appointment-category">Tipo de atendimento</label>
                  <select
                    id="edit-appointment-category"
                    className="agenda-form-input"
                    value={editCategory}
                    onChange={(event) => setEditCategory(event.target.value as AppointmentCategory)}
                  >
                    {APPOINTMENT_CATEGORY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="agenda-form-group">
                  <label className="agenda-form-label" htmlFor="edit-appointment-observation">Observação</label>
                  <textarea
                    id="edit-appointment-observation"
                    className="agenda-form-textarea"
                    value={editObservation}
                    onChange={(event) => setEditObservation(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Adicione uma observação opcional"
                  />
                </div>

                {actionError && <span className="agenda-form-error">{actionError}</span>}

                <div className="agenda-confirm-actions">
                  <button type="button" className="ghost" onClick={() => setModalView('actions')} disabled={actionLoading}>
                    Voltar
                  </button>
                  <button type="button" className="primary" onClick={handleConfirmEdit} disabled={actionLoading}>
                    {actionLoading ? 'Salvando…' : 'Salvar Alterações'}
                  </button>
                </div>
              </>
            )}

            {/* === Tela de cancelamento === */}
            {modalView === 'cancel' && (
              <>
                <h2>Cancelar Agendamento</h2>
                <p className="agenda-detail-sub">
                  {selectedAppointment.patient?.name} — {formatTimeRange(selectedAppointment.dateTime, selectedAppointment.endDateTime)}
                </p>

                <div className="agenda-form-group">
                  <label className="agenda-form-label">
                    Justificativa <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <textarea
                    className="agenda-form-textarea"
                    placeholder="Informe o motivo do cancelamento..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                  />
                </div>

                {actionError && (
                  <span className="agenda-form-error">{actionError}</span>
                )}

                <div className="agenda-confirm-actions">
                  <button type="button" className="ghost" onClick={() => setModalView('actions')} disabled={actionLoading}>
                    Voltar
                  </button>
                  <button type="button" className="primary danger" onClick={handleConfirmCancel} disabled={actionLoading}>
                    {actionLoading ? 'Cancelando…' : 'Confirmar Cancelamento'}
                  </button>
                </div>
              </>
            )}

            {/* === Tela de reagendamento === */}
            {modalView === 'reschedule' && (
              <>
                <h2>Reagendar</h2>
                <p className="agenda-detail-sub">
                  {selectedAppointment.patient?.name} — {formatTimeRange(selectedAppointment.dateTime, selectedAppointment.endDateTime)}
                </p>

                <div className="agenda-form-group">
                  <label className="agenda-form-label">Nova Data</label>
                  <input
                    type="date"
                    className="agenda-form-input"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>

                <div className="agenda-reschedule-grid">
                  <div className="agenda-form-group">
                    <label className="agenda-form-label">Novo Horário</label>
                    <select
                      className="agenda-form-input"
                      value={rescheduleStart}
                      onChange={(e) => {
                        const start = e.target.value
                        setRescheduleStart(start)
                        if (rescheduleEnd && rescheduleEnd <= start) {
                          setRescheduleEnd('')
                        }
                      }}
                    >
                      <option value="">Selecionar</option>
                      {TIME_SLOTS.filter((t) => {
                        const occupied = new Set(
                          appointments
                            .filter((a) => a.id !== selectedAppointment.id)
                            .map((a) => {
                              const d = new Date(a.dateTime)
                              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                            }),
                        )
                        return !occupied.has(t)
                      }).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="agenda-form-group">
                    <label className="agenda-form-label">Novo Fim</label>
                    <select
                      className="agenda-form-input"
                      value={rescheduleEnd}
                      onChange={(e) => setRescheduleEnd(e.target.value)}
                    >
                      <option value="">Selecionar</option>
                      {TIME_SLOTS.filter((t) => t > rescheduleStart).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {actionError && (
                  <span className="agenda-form-error">{actionError}</span>
                )}

                <div className="agenda-confirm-actions">
                  <button type="button" className="ghost" onClick={() => setModalView('actions')} disabled={actionLoading}>
                    Voltar
                  </button>
                  <button type="button" className="primary" onClick={handleConfirmReschedule} disabled={actionLoading}>
                    {actionLoading ? 'Reagendando…' : 'Confirmar Reagendamento'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
