import { useState, useEffect } from 'react'
import { CustomSelect } from '../common/CustomSelect'
import type { SelectOption } from '../common/CustomSelect'
import { useAgendaStore } from '../../stores/useAgendaStore'
import { useAuthStore } from '../../stores/authStore'
import { TutorsService } from '../../services/tutors.service'
import { PatientsService } from '../../services/patients.service'
import type { Tutor, Patient, AppointmentCategory } from '../../types'
import '../../styles/modal.css'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialTutorId?: string
  initialPatientId?: string
  initialCategory?: AppointmentCategory | string
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

const CATEGORY_OPTIONS: SelectOption[] = [
  { label: 'Consulta geral', value: 'GENERAL' },
  { label: 'Retorno', value: 'RETURN' },
  { label: 'Avaliação cirúrgica', value: 'SURGICAL_EVALUATION' },
  { label: 'Consulta', value: 'OBSERVATION' },
  { label: 'Vacinação', value: 'VACCINATION' },
  { label: 'Exame', value: 'EXAM' },
  { label: 'Cirurgia', value: 'SURGICAL' },
]

export function ScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  initialTutorId,
  initialPatientId,
  initialCategory,
}: ScheduleModalProps) {
  const [tutorId, setTutorId] = useState('')
  const [patientId, setPatientId] = useState('')
  const [data, setData] = useState('')
  const [horarioInicio, setHorarioInicio] = useState('')
  const [horarioFim, setHorarioFim] = useState('')
  const [category, setCategory] = useState('')
  const [observacao, setObservacao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [tutors, setTutors] = useState<Tutor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingTutors, setLoadingTutors] = useState(false)
  const [loadingPatients, setLoadingPatients] = useState(false)

  const { createAppointment, selectedDate, appointments } = useAgendaStore()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!isOpen) return
    setData(selectedDate)
    if (initialTutorId) setTutorId(initialTutorId)
    if (initialCategory) setCategory(initialCategory)
    setLoadingTutors(true)
    TutorsService.list(1)
      .then((res) => setTutors(res.tutors))
      .catch(() => {})
      .finally(() => setLoadingTutors(false))
  }, [isOpen, selectedDate, initialTutorId, initialCategory])

  useEffect(() => {
    if (!tutorId) {
      setPatients([])
      setPatientId('')
      return
    }
    setLoadingPatients(true)
    setPatientId('')
    PatientsService.list(1, undefined, tutorId)
      .then((res) => {
        setPatients(res.patients)
        if (initialPatientId && res.patients.some((p) => p.id === initialPatientId)) {
          setPatientId(initialPatientId)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPatients(false))
  }, [tutorId, initialPatientId])

  const resetForm = () => {
    setTutorId('')
    setPatientId('')
    setData('')
    setHorarioInicio('')
    setHorarioFim('')
    setCategory('')
    setObservacao('')
    setSubmitError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!patientId || !data || !horarioInicio || !horarioFim || !category) {
      setSubmitError('Preencha todos os campos obrigatórios.')
      return
    }

    if (!user) {
      setSubmitError('Você precisa estar logado para agendar.')
      return
    }

    const dateTime = new Date(`${data}T${horarioInicio}`).toISOString()
    const endDateTime = new Date(`${data}T${horarioFim}`).toISOString()

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await createAppointment({
        patientId,
        vetId: user.id,
        dateTime,
        endDateTime,
        category: category as AppointmentCategory,
        observation: observacao || undefined,
      })
      resetForm()
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      const message =
        (err as Error)?.message ?? 'Erro ao agendar.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const occupiedStarts = new Set(
    appointments.map((a) => {
      const d = new Date(a.dateTime)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }),
  )
  const availableStartSlots = TIME_SLOTS.filter((t) => !occupiedStarts.has(t))

  const tutorOptions: SelectOption[] = tutors.map((t) => ({
    label: t.fullName,
    value: t.id,
  }))

  const patientOptions: SelectOption[] = patients.map((p) => ({
    label: p.name,
    value: p.id,
  }))

  return (
    <div className="modal-overlay schedule-modal-overlay" onClick={handleClose}>
      <div
        className="modal-content schedule-modal-content"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="modal-header">
          <svg
            className="modal-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="14.5" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="14.5" r="1.5" fill="currentColor" />
            <circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="18.5" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" />
          </svg>
          <h2>Agendamento</h2>
        </div>

        <div className="modal-grid">

          <div className="form-group">
            <label className="form-label">
              Tutor : <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <CustomSelect
              value={tutorId}
              onChange={(val) => {
                setTutorId(val)
                setPatientId('')
              }}
              options={tutorOptions}
              placeholder={loadingTutors ? 'Carregando…' : 'Selecionar tutor'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Paciente: <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <CustomSelect
              value={patientId}
              onChange={setPatientId}
              options={patientOptions}
              placeholder={
                !tutorId
                  ? 'Selecione um tutor primeiro'
                  : loadingPatients
                    ? 'Carregando…'
                    : 'Selecionar paciente'
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Data : <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="date"
              className="modal-form-input"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Veterinário :</label>
            <input
              type="text"
              className="modal-form-input"
              value={user?.name ?? '—'}
              disabled
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Início : <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <CustomSelect
              value={horarioInicio}
              onChange={(val) => {
                setHorarioInicio(val)
                if (horarioFim && horarioFim <= val) setHorarioFim('')
              }}
              options={availableStartSlots}
              placeholder="Selecionar início"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Fim : <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <CustomSelect
              value={horarioFim}
              onChange={setHorarioFim}
              options={horarioInicio ? TIME_SLOTS.filter((t) => t > horarioInicio) : []}
              placeholder={horarioInicio ? 'Selecionar fim' : 'Selecione o início primeiro'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Tipo de atendimento : <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
              placeholder="Selecionar tipo"
            />
          </div>

          <div className="form-group form-group-full">
            <label className="form-label">Observação:</label>
            <textarea
              className="modal-form-input"
              placeholder="Escreva uma observação se necessário"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              style={{ resize: 'none' }}
            />
          </div>

          {submitError && (
            <div className="form-group form-group-full">
              <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                {submitError}
              </span>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button
            className="btn btn-cancel"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            className="btn btn-submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Agendando…' : 'Agendar'}
          </button>
        </div>

      </div>
    </div>
  )
}
