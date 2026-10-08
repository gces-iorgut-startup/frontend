import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronLeft,
  ClipboardPlus,
  Download,
  Edit2,
  FileText,
  FileUp,
  KeyRound,
  PawPrint,
  Stethoscope,
  User,
} from 'lucide-react'
import { api } from '../../lib/api'
import { clinicalService } from '../../lib/clinicalService'
import { getErrorMessage } from '../../lib/errorMessage'
import { examService } from '../../lib/examService'
import { AppointmentsService } from '../../services/appointments.service'
import { TutorsService } from '../../services/tutors.service'
import { useAuthStore } from '../../stores/authStore'
import { UploadExamModal } from '../../components/UploadExamModal'
import type {
  Appointment,
  ClinicalHistoryItem,
  CreateTutorAccountResponse,
  ExamFile,
  Patient,
} from '../../types'
import '../../styles/patients.css'

type DetailsTab = 'dados' | 'prontuario' | 'exames'
const IMMEDIATE_APPOINTMENT_WINDOW_MS = 30 * 60 * 1000

function getAppointmentCategoryLabel(category?: string | null) {
  switch (category) {
    case 'VACCINATION':
      return 'Vacinação'
    case 'EXAM':
      return 'Exame'
    case 'SURGICAL':
      return 'Cirúrgico'
    case 'OBSERVATION':
      return 'Consulta'
    default:
      return 'Atendimento'
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR')
}

function getAge(birthDateStr?: string | null) {
  if (!birthDateStr) return '—'
  const birth = new Date(birthDateStr)
  if (Number.isNaN(birth.getTime())) return '—'

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return age > 0 ? `${age} anos` : 'Menos de 1 ano'
}

function formatWeight(value?: number | null) {
  return value ? `${value} kg` : '—'
}

function formatMicrochip(value?: string | null) {
  if (!value || value === 'Não') return 'Não possui'
  if (value === 'Sim') return 'Possui'
  return `Possui (${value})`
}

function extractAddress(addressStr?: string | null) {
  const raw = {
    cep: '—',
    state: '—',
    city: '—',
    neighborhood: '—',
    street: '—',
    num: '—',
    complement: '—',
  }

  if (!addressStr) return raw

  const parts = addressStr.split(',').map((item) => item.trim()).filter(Boolean)
  const cepPart = parts.find((item) => item.startsWith('CEP:'))
  const numPart = parts.find((item) => item.startsWith('nº'))

  raw.street = parts[0] || '—'
  if (cepPart) raw.cep = cepPart.replace('CEP:', '').trim()
  if (numPart) raw.num = numPart.replace('nº', '').trim()

  let cursor = parts.length - 1
  if (cepPart) cursor -= 1

  if (cursor > 0 && parts[cursor] !== numPart && parts[cursor] !== raw.street) {
    raw.state = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numPart && parts[cursor] !== raw.street) {
    raw.city = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numPart && parts[cursor] !== raw.street) {
    raw.neighborhood = parts[cursor]
    cursor -= 1
  }

  if (numPart) {
    const numIdx = parts.indexOf(numPart)
    if (numIdx !== -1 && numIdx < cursor) {
      raw.complement = parts.slice(numIdx + 1, cursor + 1).join(', ') || '—'
    }
  } else if (cursor > 0) {
    raw.complement = parts.slice(1, cursor + 1).join(', ') || '—'
  }

  return raw
}

function getTodayISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isCompatibleAppointment(
  appointment: Appointment,
  patientId: string,
  vetId: string,
  now: Date,
) {
  if (appointment.patientId !== patientId || appointment.vetId !== vetId) return false
  if (appointment.status !== 'SCHEDULED' && appointment.status !== 'IN_PROGRESS') return false

  const appointmentTime = new Date(appointment.dateTime).getTime()
  if (Number.isNaN(appointmentTime)) return false

  return Math.abs(appointmentTime - now.getTime()) <= IMMEDIATE_APPOINTMENT_WINDOW_MS
}

function compareAppointmentsByPriority(a: Appointment, b: Appointment, now: Date) {
  if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1
  if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1

  const distanceA = Math.abs(new Date(a.dateTime).getTime() - now.getTime())
  const distanceB = Math.abs(new Date(b.dateTime).getTime() - now.getTime())
  return distanceA - distanceB
}

export function PatientDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [history, setHistory] = useState<ClinicalHistoryItem[]>([])
  const [exams, setExams] = useState<ExamFile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DetailsTab>('dados')
  const [isStartingCare, setIsStartingCare] = useState(false)
  const [startCareError, setStartCareError] = useState('')
  const [showStartCareModal, setShowStartCareModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showTutorAccessModal, setShowTutorAccessModal] = useState(false)
  const [tutorAccessEmail, setTutorAccessEmail] = useState('')
  const [creatingTutorAccess, setCreatingTutorAccess] = useState(false)
  const [tutorAccessError, setTutorAccessError] = useState('')
  const [createdTutorAccess, setCreatedTutorAccess] =
    useState<CreateTutorAccountResponse | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false
    setLoading(true)

    Promise.all([
      api.get(`/patients/${id}`),
      clinicalService.getPatientHistory(id),
      examService.listPatientExams(id),
    ])
      .then(([patientResponse, historyResponse, examsResponse]) => {
        if (cancelled) return
        setPatient(patientResponse.data.patient || patientResponse.data)
        setHistory(historyResponse)
        setExams(examsResponse)
      })
      .catch((err) => {
        console.error('Erro ao buscar paciente:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    setTutorAccessEmail(patient?.tutor?.email ?? '')
  }, [patient?.tutor?.email, patient?.tutor?.id])

  if (loading) {
    return (
      <div className="patient-details-loading">
        <div className="spinner spinner-dark" />
      </div>
    )
  }

  if (!patient) {
    return <div className="patient-details-empty">Paciente não encontrado.</div>
  }

  const address = extractAddress(patient.tutor?.address)
  const visibleHistory = history.filter((item) => item.finalized)

  async function handleCreateTutorAccess() {
    if (!patient?.tutor?.id) {
      setTutorAccessError('Tutor nao encontrado para este paciente.')
      return
    }

    if (!tutorAccessEmail.trim()) {
      setTutorAccessError('Informe um e-mail valido para criar o acesso do tutor.')
      return
    }

    setTutorAccessError('')
    setCreatingTutorAccess(true)

    try {
      const response = await TutorsService.createAccount(patient.tutor.id, tutorAccessEmail.trim())

      setCreatedTutorAccess(response)

      setPatient((current) => {
        if (!current?.tutor) return current
        return {
          ...current,
          tutor: {
            ...current.tutor,
            email: response.email,
            userId: response.userId,
          },
        }
      })
    } catch (err: unknown) {
      setTutorAccessError(getErrorMessage(err, 'Nao foi possivel criar o acesso do tutor.'))
    } finally {
      setCreatingTutorAccess(false)
    }
  }

  async function handleStartCare() {
    if (!patient || !user) {
      setStartCareError('Você precisa estar logado para iniciar o atendimento.')
      return
    }

    const now = new Date()
    setIsStartingCare(true)
    setStartCareError('')

    try {
      const appointments = await AppointmentsService.listByDay(getTodayISO(), user.id)
      const existingAppointment = appointments
        .filter((appointment) => isCompatibleAppointment(appointment, patient.id, user.id, now))
        .sort((a, b) => compareAppointmentsByPriority(a, b, now))[0]

      if (existingAppointment) {
        navigate(`/atendimentos/${existingAppointment.id}/pacientes/${patient.id}`)
        return
      }

      const immediateAppointment = await AppointmentsService.create({
        patientId: patient.id,
        vetId: user.id,
        dateTime: now.toISOString(),
        category: 'OBSERVATION',
        observation: 'Atendimento iniciado pela pagina do paciente.',
      })

      navigate(`/atendimentos/${immediateAppointment.id}/pacientes/${patient.id}`)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.error ??
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.message ??
        'Nao foi possivel iniciar o atendimento.'

      setStartCareError(message)
    } finally {
      setIsStartingCare(false)
    }
  }

  return (
    <div className="patient-details-page">
      <div className="patient-details-topbar">
        <button className="patient-details-back" onClick={() => navigate('/pacientes')} type="button">
          <ChevronLeft size={18} />
          Voltar
        </button>

        <div className="patient-details-actions">
          <button
            type="button"
            onClick={() => setShowStartCareModal(true)}
            disabled={isStartingCare}
          >
            <Stethoscope size={18} />
            {isStartingCare ? 'Iniciando...' : 'Atender'}
          </button>
          <button type="button" onClick={() => navigate(`/pacientes/${patient.id}/editar`)}>
            <Edit2 size={18} />
            Editar dados
          </button>
        </div>
      </div>

      {startCareError ? <p className="patient-details-inline-error">{startCareError}</p> : null}

      <div className="patient-details-tabs">
        <button
          className={`patient-details-tab${activeTab === 'dados' ? ' active' : ''}`}
          onClick={() => setActiveTab('dados')}
          type="button"
        >
          Dados
        </button>
        <button
          className={`patient-details-tab${activeTab === 'prontuario' ? ' active' : ''}`}
          onClick={() => setActiveTab('prontuario')}
          type="button"
        >
          Prontuário
        </button>
        <button
          className={`patient-details-tab${activeTab === 'exames' ? ' active' : ''}`}
          onClick={() => setActiveTab('exames')}
          type="button"
        >
          Exames
        </button>
      </div>

      {activeTab === 'dados' && (
        <div className="patient-details-content">
          <div className="patient-details-section-title">
            <PawPrint size={22} />
            <h2>Paciente</h2>
          </div>

          <div className="patient-details-pet-grid">
            <div className="patient-details-photo">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} />
              ) : (
                <PawPrint size={48} />
              )}
            </div>

            <div className="patient-details-info-grid two-columns">
              <div className="patient-details-info-row">
                <span>Nome do Pet:</span>
                <strong>{patient.name}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Sexo:</span>
                <strong>{patient.sex || '—'}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Data de nascimento:</span>
                <strong>{formatDate(patient.birthDate)}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Peso atual:</span>
                <strong>{formatWeight(patient.weightKg)}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Idade:</span>
                <strong>{getAge(patient.birthDate)}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Microchip:</span>
                <strong>{formatMicrochip(patient.microchip)}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Espécie:</span>
                <strong>{patient.species}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Observações:</span>
                <strong>{patient.observations || '—'}</strong>
              </div>
              <div className="patient-details-info-row">
                <span>Raça:</span>
                <strong>{patient.breed || '—'}</strong>
              </div>
            </div>
          </div>

          <div className="patient-details-section-title tutor with-action">
            <div className="patient-details-section-title-group">
              <User size={22} />
              <h2>Tutor</h2>
            </div>

            {patient.tutor?.userId ? (
              <span className="patient-details-tutor-access-tag">
                <CheckCircle2 size={15} />
                Acesso ativo
              </span>
            ) : (
              <button
                type="button"
                className="patient-details-tutor-access-btn"
                onClick={() => {
                  setTutorAccessEmail(patient.tutor?.email ?? '')
                  setTutorAccessError('')
                  setCreatedTutorAccess(null)
                  setShowTutorAccessModal(true)
                }}
              >
                <KeyRound size={16} />
                Gerar acesso ao portal
              </button>
            )}
          </div>

          <h3 className="patient-details-subtitle">Dados básicos</h3>
          <div className="patient-details-info-grid single-column">
            <div className="patient-details-info-row">
              <span>Nome completo:</span>
              <strong>{patient.tutor?.fullName || '—'}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>CPF:</span>
              <strong>{patient.tutor?.cpf || '—'}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Contato:</span>
              <strong>{patient.tutor?.phone || '—'}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Email:</span>
              <strong>{patient.tutor?.email || '—'}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Convênio:</span>
              <strong>{patient.tutor?.insurance || 'Não possui'}</strong>
            </div>
          </div>

          <h3 className="patient-details-subtitle">Endereço</h3>
          <div className="patient-details-info-grid two-columns">
            <div className="patient-details-info-row">
              <span>CEP:</span>
              <strong>{address.cep}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Logradouro:</span>
              <strong>{address.street}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Estado:</span>
              <strong>{address.state}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Número:</span>
              <strong>{address.num}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Cidade:</span>
              <strong>{address.city}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Complemento:</span>
              <strong>{address.complement}</strong>
            </div>
            <div className="patient-details-info-row">
              <span>Bairro:</span>
              <strong>{address.neighborhood}</strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prontuario' && (
        <section className="patient-records-panel">
          <div className="patient-records-table-wrapper">
            <table className="patient-records-table">
              <thead>
                <tr>
                  <th>Atendimento</th>
                  <th>Profissional responsável</th>
                  <th>Data</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.length > 0 ? (
                  visibleHistory.map((item) => (
                    <tr key={item.id}>
                      <td>{getAppointmentCategoryLabel(item.appointment?.category)}</td>
                      <td>{item.vet?.name || 'Não informado'}</td>
                      <td>{formatDate(item.appointment?.dateTime ?? item.createdAt)}</td>
                      <td>
                        <button
                          className="patient-records-action"
                          onClick={() =>
                            navigate(`/historico/${item.id}/pacientes/${patient.id}`, {
                              state: { from: `/pacientes/${patient.id}` },
                            })
                          }
                          type="button"
                        >
                          <FileText size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="patient-records-empty">
                      Nenhum prontuário anterior encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'exames' && (
        <section className="patient-records-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b' }}>Exames Anexados</h3>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--pink-300)', color: '#fff', border: 'none',
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 500, fontSize: '0.875rem'
              }}
            >
              <FileUp size={16} />
              Anexar Exame
            </button>
          </div>

          <div className="patient-records-table-wrapper">
            <table className="patient-records-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Data do Upload</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {exams.length > 0 ? (
                  exams.map((item) => (
                    <tr key={item.id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.fileType === 'pdf' ? (
                           <FileText size={18} color="#ef4444" />
                        ) : (
                           <FileText size={18} color="#3b82f6" />
                        )}
                        <span style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {item.fileName}
                        </span>
                      </td>
                      <td>{formatDate(item.uploadedAt)}</td>
                      <td>
                        <button
                          onClick={() => examService.downloadExamFile(item.fileUrl, item.fileName)}
                          className="patient-records-action"
                          style={{ display: 'inline-flex', padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="patient-records-empty">
                      Nenhum exame anexado a este paciente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showStartCareModal && (
        <div className="patient-edit-modal-overlay" role="presentation">
          <div className="patient-edit-modal">
            <ClipboardPlus className="patient-edit-modal-icon save" />
            <h3>Realizar atendimento</h3>
            <p>Deseja iniciar um atendimento?</p>

            <div className="patient-edit-modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setShowStartCareModal(false)}
                disabled={isStartingCare}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="confirm save"
                onClick={() => {
                  setShowStartCareModal(false)
                  void handleStartCare()
                }}
                disabled={isStartingCare}
              >
                {isStartingCare ? 'Iniciando...' : 'Atender'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <UploadExamModal
          patientId={patient.id}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(exam) => {
            setExams((prev) => [exam, ...prev])
            setShowUploadModal(false)
          }}
        />
      )}

      {showTutorAccessModal && (
        <div className="patient-edit-modal-overlay" role="presentation">
          <div className="patient-edit-modal">
            <KeyRound className="patient-edit-modal-icon save" />
            <h3>Acesso do tutor</h3>

            {createdTutorAccess ? (
              <>
                <p>Conta criada com sucesso! O link para definir a senha de acesso foi enviado para o e-mail cadastrado.</p>

                <div className="patient-details-access-result">
                  <div>
                    <span>E-mail de acesso</span>
                    <strong>{createdTutorAccess.email}</strong>
                  </div>
                </div>

                <div className="patient-edit-modal-actions">
                  <button
                    type="button"
                    className="confirm save"
                    onClick={() => setShowTutorAccessModal(false)}
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Defina o e-mail de acesso. O link para criação e redefinição de senha será enviado para este e-mail.</p>

                <div className="patient-details-access-form">
                  <label htmlFor="tutor-access-email">E-mail de acesso</label>
                  <input
                    id="tutor-access-email"
                    type="email"
                    value={tutorAccessEmail}
                    onChange={(event) => setTutorAccessEmail(event.target.value)}
                    placeholder="tutor@exemplo.com"
                  />
                  {tutorAccessError ? (
                    <span className="patient-details-access-feedback">{tutorAccessError}</span>
                  ) : null}
                </div>

                <div className="patient-edit-modal-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setShowTutorAccessModal(false)}
                    disabled={creatingTutorAccess}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="confirm save"
                    onClick={() => void handleCreateTutorAccess()}
                    disabled={creatingTutorAccess}
                  >
                    {creatingTutorAccess ? 'Enviando...' : 'Enviar link de acesso'}
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
