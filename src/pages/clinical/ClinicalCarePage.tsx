import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  LoaderCircle,
  PawPrint,
  Printer,
  Save,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { clinicalService } from '../../lib/clinicalService'
import { getErrorMessage } from '../../lib/errorMessage'
import { WeightEvolutionChart } from '../../components/WeightEvolutionChart'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import {
  getCareFormValues,
  getClinicalRecordPayload,
  type CareFormValues,
} from '../../lib/clinicalRecordContent'
import type {
  ClinicalHistoryItem,
  ClinicalRecord,
  Patient,
  Vaccination,
} from '../../types'
import '../../styles/clinical-care.css'

type CareTab = 'atendimento' | 'dados' | 'prontuario'

const EMPTY_FORM: CareFormValues = {
  weightKg: '',
  clinicalNotes: '',
  breathingNotes: '',
  observations: '',
  examRequests: '',
  diagnosis: '',
  prescriptions: '',
  additionalObservations: '',
}

function getAppointmentCategoryLabel(category?: string | null) {
  switch (category) {
    case 'GENERAL':
      return 'Consulta geral'
    case 'RETURN':
      return 'Retorno'
    case 'SURGICAL_EVALUATION':
      return 'Avaliação cirúrgica'
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

function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR')
}

function calculateAge(birthDate?: string | null) {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '—'

  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years -= 1
    months += 12
  }

  if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`
  if (months > 0) return `${months} m${months > 1 ? 'eses' : 'ês'}`
  return 'Recém-nascido'
}

function formatWeight(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—'
  return `${value} kg`
}

/**
 * "Peso atual" aparece em três lugares desta tela. A fonte mais confiável é
 * a aferição mais recente: o que foi pesado neste atendimento ganha do último
 * atendimento finalizado, que por sua vez ganha do peso do cadastro — esse
 * último só muda quando alguém edita o paciente à mão, então envelhece.
 */
function resolveCurrentWeight(
  savedWeightKg: string | undefined,
  history: ClinicalHistoryItem[],
  patient: Patient
) {
  if (savedWeightKg) return formatWeight(savedWeightKg)

  const lastMeasured = history.find((item) => item.finalized && item.weightKg != null)
  if (lastMeasured?.weightKg != null) return formatWeight(lastMeasured.weightKg)

  return formatWeight(patient.weightKg as string | number | null | undefined)
}

function getMicrochipLabel(value?: string | null) {
  if (!value) return 'Não possui'
  return value === 'Sim' ? 'Possui' : value
}

function extractAddress(addressStr?: string | null) {
  const raw = {
    cep: '—',
    state: '—',
    city: '—',
    neighborhood: '—',
    street: '—',
    number: '—',
    complement: '—',
  }

  if (!addressStr) return raw

  const parts = addressStr.split(',').map((item) => item.trim()).filter(Boolean)
  const cepPart = parts.find((item) => item.startsWith('CEP:'))
  const numberPart = parts.find((item) => item.startsWith('nº'))

  raw.street = parts[0] ?? '—'
  if (cepPart) raw.cep = cepPart.replace('CEP:', '').trim()
  if (numberPart) raw.number = numberPart.replace('nº', '').trim()

  let cursor = parts.length - 1
  if (cepPart) cursor -= 1

  if (cursor > 0 && parts[cursor] !== numberPart && parts[cursor] !== raw.street) {
    raw.state = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numberPart && parts[cursor] !== raw.street) {
    raw.city = parts[cursor]
    cursor -= 1
  }
  if (cursor > 0 && parts[cursor] !== numberPart && parts[cursor] !== raw.street) {
    raw.neighborhood = parts[cursor]
    cursor -= 1
  }

  if (numberPart) {
    const numberIndex = parts.indexOf(numberPart)
    if (numberIndex !== -1 && numberIndex < cursor) {
      raw.complement = parts.slice(numberIndex + 1, cursor + 1).join(', ') || '—'
    }
  } else if (cursor > 0) {
    raw.complement = parts.slice(1, cursor + 1).join(', ') || '—'
  }

  return raw
}

function buildHistorySummary(
  patient: Patient,
  history: ClinicalHistoryItem[],
  vaccinations: Vaccination[],
  savedWeightKg?: string
) {
  const nextPending = vaccinations
    .filter((item) => item.status === 'PENDING' && item.nextDoseAt)
    .sort((a, b) => new Date(a.nextDoseAt ?? '').getTime() - new Date(b.nextDoseAt ?? '').getTime())[0]

  const overdueCount = vaccinations.filter((item) => item.status === 'OVERDUE').length
  const upToDateCount = vaccinations.filter((item) => item.status === 'UP_TO_DATE').length
  const lastFinished = history.find((item) => item.finalized)

  return {
    species: getPatientSpeciesLabel(patient.species),
    age: calculateAge(patient.birthDate),
    weight: resolveCurrentWeight(savedWeightKg, history, patient),
    vaccination: nextPending
      ? `Próxima dose em ${formatDate(nextPending.nextDoseAt)}`
      : overdueCount > 0
        ? `${overdueCount} vacina(s) atrasada(s)`
        : upToDateCount > 0
          ? 'Controle vacinal em dia'
          : 'Sem dados vacinais',
    previousVisits: history
      .filter((item) => item.finalized)
      .map((item) => ({
        id: item.id,
        date: formatDate(item.appointment?.dateTime ?? item.createdAt),
        summary:
          item.aiSummary?.trim() ||
          item.diagnosis?.trim() ||
          item.clinicalNotes?.trim() ||
          'Atendimento registrado sem resumo disponível.',
      })),
    lastDiagnosis: lastFinished?.diagnosis || null,
  }
}

export function ClinicalCarePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { appointmentId, patientId } = useParams<{
    appointmentId: string
    patientId: string
  }>()

  const [activeTab, setActiveTab] = useState<CareTab>(() => {
    const state = location.state as { tab?: CareTab }
    console.log('CarePage initial state:', location.state)
    return state?.tab || 'atendimento'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [record, setRecord] = useState<ClinicalRecord | null>(null)
  const [history, setHistory] = useState<ClinicalHistoryItem[]>([])
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [form, setForm] = useState<CareFormValues>(EMPTY_FORM)
  const [savedForm, setSavedForm] = useState<CareFormValues>(EMPTY_FORM)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const currentAppointmentCategory = useMemo(
    () => history.find(item => item.appointmentId === appointmentId)?.appointment?.category,
    [appointmentId, history],
  )

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      if (!patientId) {
        setError('Os parâmetros da rota estão incompletos para iniciar o atendimento.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        if (!appointmentId) {
          throw new Error('Agendamento inválido para iniciar o atendimento.')
        }

        const startedRecord = await clinicalService.startClinicalRecord(appointmentId)
        const [patientData, historyData, vaccinationsData] = await Promise.all([
          clinicalService.getPatient(patientId),
          clinicalService.getPatientHistory(patientId),
          clinicalService.getPatientVaccinations(patientId),
        ])

        if (cancelled) return

        const nextForm = getCareFormValues(startedRecord)
        setRecord(startedRecord)
        setPatient(patientData)
        setHistory(historyData)
        setVaccinations(vaccinationsData)
        setForm(nextForm)
        setSavedForm(nextForm)
      } catch (err: unknown) {
        if (cancelled) return
        setError(getErrorMessage(err, 'Não foi possível carregar o atendimento.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPage()

    return () => {
      cancelled = true
    }
  }, [appointmentId, patientId])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm)
  const address = extractAddress(patient?.tutor?.address)

  const visibleHistory = useMemo(() => {
    if (!record) return history
    return history.filter((item) => item.id !== record.id || item.finalized)
  }, [history, record])

  const summary = useMemo(() => {
    if (!patient) return null
    return buildHistorySummary(patient, visibleHistory, vaccinations, savedForm.weightKg)
  }, [patient, savedForm.weightKg, vaccinations, visibleHistory])

  async function refreshHistoryData() {
    if (!patientId) return
    const [historyData, vaccinationsData] = await Promise.all([
      clinicalService.getPatientHistory(patientId),
      clinicalService.getPatientVaccinations(patientId),
    ])
    setHistory(historyData)
    setVaccinations(vaccinationsData)
  }

  function handleFieldChange(field: keyof CareFormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSave() {
    if (!record) return
    setSaving(true)
    setError('')

    try {
      const payload = getClinicalRecordPayload(form)

      const updated = await clinicalService.updateClinicalRecord(record.id, payload)

      const nextForm = getCareFormValues(updated)
      setRecord(updated)
      setForm(nextForm)
      setSavedForm(nextForm)
      setToast({ type: 'success', message: 'Atendimento salvo com sucesso.' })
    } catch (err: unknown) {
      setToast({ type: 'error', message: getErrorMessage(err, 'Não foi possível salvar o atendimento.') })
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalize() {
    if (!record) return
    setFinalizing(true)
    setShowFinalizeModal(false)

    try {
      if (isDirty) {
        const payload = getClinicalRecordPayload(form)
        const updated = await clinicalService.updateClinicalRecord(record.id, payload)
        const nextForm = getCareFormValues(updated)
        setRecord(updated)
        setForm(nextForm)
        setSavedForm(nextForm)
      }

      const finalizedRecord = await clinicalService.finalizeClinicalRecord(
        record.id,
        new Date().toISOString(),
      )
      setRecord(finalizedRecord)
      await refreshHistoryData()
      setToast({ type: 'success', message: 'Atendimento finalizado com sucesso.' })
      setActiveTab('prontuario')
    } catch (err: unknown) {
      setToast({ type: 'error', message: getErrorMessage(err, 'Não foi possível finalizar o atendimento.') })
    } finally {
      setFinalizing(false)
    }
  }

  async function handlePrint() {
    if (!record?.finalized) return

    setPrinting(true)
    try {
      const blob = await clinicalService.getPrescriptionPdf(record.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (err: unknown) {
      setToast({ type: 'error', message: getErrorMessage(err, 'Não foi possível gerar o PDF do receituário.') })
    } finally {
      setPrinting(false)
    }
  }

  function handleBack() {
    if (!record?.finalized) {
      setShowExitModal(true)
      return
    }
    navigate(-1)
  }

  function renderIougurtVetCard(extraClassName = '') {
    return (
      <div className={`care-side-card${extraClassName ? ` ${extraClassName}` : ''}`}>
        <div className="care-side-header">
          <Stethoscope size={18} />
          <h3>Iougurt Vet</h3>
        </div>

        {summary && (
          <div className="care-side-content">
            <div>
              <p className="care-side-subtitle">Histórico do paciente</p>
              <ul className="care-bullet-list">
                <li>Espécie: {summary.species}</li>
                <li>Idade: {summary.age}</li>
                <li>Peso atual: {summary.weight}</li>
                <li>Vacinação: {summary.vaccination}</li>
                {summary.lastDiagnosis && <li>Último diagnóstico: {summary.lastDiagnosis}</li>}
              </ul>
            </div>

            <div>
              <p className="care-side-subtitle">Consultas anteriores</p>
              {summary.previousVisits.length > 0 ? (
                <ul className="care-previous-list">
                  {summary.previousVisits.map((item) => (
                    <li key={item.id}>
                      <span>{item.date}</span>
                      <p>{item.summary}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="care-empty-copy">Ainda não há consultas anteriores finalizadas.</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="care-page-loading">
        <LoaderCircle className="care-spin" />
      </div>
    )
  }

  if (error || !patient || !record) {
    return (
      <div className="care-page-error">
        <AlertCircle />
        <p>{error || 'Não foi possível carregar os dados do atendimento.'}</p>
      </div>
    )
  }

  return (
    <div className="care-page">
      {toast && (
        <div className={`care-toast ${toast.type}`}>
          <CheckCircle2 />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="care-page-topbar">
        <button className="care-back-button" onClick={handleBack} type="button">
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="care-top-actions">
          <button
            className="care-top-action"
            onClick={handlePrint}
            type="button"
            disabled={!record.finalized || printing}
          >
            <Printer size={16} />
            {printing ? 'Gerando PDF...' : 'Gerar Receita'}
          </button>
          <button
            className="care-top-action care-top-action-primary"
            onClick={handleSave}
            type="button"
            disabled={saving || record.finalized || !isDirty}
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button
            className="care-top-action"
            onClick={() => setShowFinalizeModal(true)}
            type="button"
            disabled={finalizing || record.finalized}
          >
            <FileText size={16} />
            {record.finalized ? 'Atendimento finalizado' : 'Finalizar atendimento'}
          </button>
        </div>
      </div>

      <div className="care-tabs">
        <button
          className={`care-tab${activeTab === 'atendimento' ? ' active' : ''}`}
          onClick={() => setActiveTab('atendimento')}
          type="button"
        >
          Atendimento
        </button>
        <button
          className={`care-tab${activeTab === 'dados' ? ' active' : ''}`}
          onClick={() => setActiveTab('dados')}
          type="button"
        >
          Dados
        </button>
        <button
          className={`care-tab${activeTab === 'prontuario' ? ' active' : ''}`}
          onClick={() => setActiveTab('prontuario')}
          type="button"
        >
          Prontuário
        </button>
      </div>

      {activeTab === 'atendimento' && (
        <section className="care-panel">
          <div className="care-grid">
            <div className="care-column-main">
              <div className="care-patient-inline">
                <div className="care-patient-photo">
                  {patient.photoUrl ? (
                    <img src={patient.photoUrl} alt={patient.name} />
                  ) : (
                    <PawPrint />
                  )}
                </div>

                <div className="care-patient-summary">
                  <div className="care-summary-row">
                    <span>Nome do pet:</span>
                    <strong>{patient.name}</strong>
                  </div>
                  <div className="care-summary-row">
                    <span>Data de nascimento:</span>
                    <strong>{formatDate(patient.birthDate)}</strong>
                  </div>
                  <div className="care-summary-row">
                    <span>Idade:</span>
                    <strong>{calculateAge(patient.birthDate)}</strong>
                  </div>
                  <div className="care-summary-row">
                    <span>Peso atual:</span>
                    <strong>
                      {resolveCurrentWeight(savedForm.weightKg, visibleHistory, patient)}
                    </strong>
                  </div>
                  <div className="care-summary-row">
                    <span>Sexo:</span>
                    <strong>{patient.sex || '—'}</strong>
                  </div>
                </div>
              </div>

              {renderIougurtVetCard('care-side-card-mobile')}

              <div className="care-appointment-type">
                <span>Tipo de atendimento</span>
                <h2>{getAppointmentCategoryLabel(currentAppointmentCategory)}</h2>
              </div>

              {/* Peso é o primeiro campo do atendimento de propósito: é a
                  medida que a balança dá na entrada da consulta, e é o que
                  alimenta o gráfico de evolução. */}
              <div className="care-form-group">
                <label htmlFor="care-weight">Peso (kg)</label>
                <input
                  id="care-weight"
                  type="text"
                  inputMode="decimal"
                  value={form.weightKg}
                  onChange={(event) => handleFieldChange('weightKg', event.target.value)}
                  placeholder="Ex.: 12,5"
                  disabled={record.finalized}
                />
              </div>

              <div className="care-form-group">
                <label htmlFor="clinical-notes">Queixa principal</label>
                <textarea
                  id="clinical-notes"
                  value={form.clinicalNotes}
                  onChange={(event) => handleFieldChange('clinicalNotes', event.target.value)}
                  placeholder="Descreva a principal queixa do tutor ou do paciente"
                  disabled={record.finalized}
                />
              </div>

              <div className="care-form-group">
                <label htmlFor="physical-exam">Exame físico</label>
                <textarea
                  id="physical-exam"
                  value={form.breathingNotes}
                  onChange={(event) => handleFieldChange('breathingNotes', event.target.value)}
                  placeholder="Registre aqui os achados do exame físico"
                  disabled={record.finalized}
                />
              </div>

              <div className="care-form-group">
                <label htmlFor="care-observations">Observações</label>
                <textarea
                  id="care-observations"
                  value={form.observations}
                  onChange={(event) => handleFieldChange('observations', event.target.value)}
                  placeholder="Escreva uma observação se necessário"
                  disabled={record.finalized}
                />
              </div>

              <div className="care-form-group">
                <label htmlFor="care-exam-requests">Pedidos de exame</label>
                <textarea
                  id="care-exam-requests"
                  value={form.examRequests}
                  onChange={(event) => handleFieldChange('examRequests', event.target.value)}
                  placeholder="Escreva uma observação se necessário"
                  disabled={record.finalized}
                />
              </div>

              <div className="care-form-group">
                <label htmlFor="care-diagnosis">Diagnóstico provisório / definitivo</label>
                <textarea
                  id="care-diagnosis"
                  value={form.diagnosis}
                  onChange={(event) => handleFieldChange('diagnosis', event.target.value)}
                  placeholder="Escreva uma observação se necessário"
                  disabled={record.finalized}
                />
              </div>

              <div className="care-form-group">
                <label htmlFor="care-prescriptions">Medicação / Prescrição</label>
                <textarea
                  id="care-prescriptions"
                  value={form.prescriptions}
                  onChange={(event) => handleFieldChange('prescriptions', event.target.value)}
                  placeholder="Escreva uma observação se necessário"
                  disabled={record.finalized}
                />
              </div>

              <div className="care-form-group">
                <label htmlFor="care-additional-observations">Observações adicionais</label>
                <textarea
                  id="care-additional-observations"
                  value={form.additionalObservations}
                  onChange={(event) => handleFieldChange('additionalObservations', event.target.value)}
                  placeholder="Escreva uma observação se necessário"
                  disabled={record.finalized}
                />
              </div>
            </div>

            <aside className="care-column-side">
              {renderIougurtVetCard('care-side-card-desktop')}
            </aside>
          </div>
        </section>
      )}

      {activeTab === 'dados' && (
        <section className="care-panel">
          <div className="care-section-title">
            <PawPrint />
            <h2>Paciente</h2>
          </div>

          <div className="care-details-grid">
            <div className="care-patient-photo large">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} />
              ) : (
                <PawPrint />
              )}
            </div>

            <div className="care-info-grid two-columns">
              <div className="care-info-row"><span>Nome do pet:</span><strong>{patient.name}</strong></div>
              <div className="care-info-row"><span>Sexo:</span><strong>{patient.sex || '—'}</strong></div>
              <div className="care-info-row"><span>Data de nascimento:</span><strong>{formatDate(patient.birthDate)}</strong></div>
              <div className="care-info-row"><span>Peso atual:</span><strong>{resolveCurrentWeight(savedForm.weightKg, visibleHistory, patient)}</strong></div>
              <div className="care-info-row"><span>Idade:</span><strong>{calculateAge(patient.birthDate)}</strong></div>
              <div className="care-info-row"><span>Microchip:</span><strong>{getMicrochipLabel(patient.microchip)}</strong></div>
              <div className="care-info-row"><span>Espécie:</span><strong>{getPatientSpeciesLabel(patient.species)}</strong></div>
              <div className="care-info-row"><span>Observações:</span><strong>{patient.observations || '—'}</strong></div>
              <div className="care-info-row"><span>Raça:</span><strong>{patient.breed || '—'}</strong></div>
            </div>
          </div>

          <div className="care-section-title tutor">
            <UserRound />
            <h2>Tutor</h2>
          </div>

          <h3 className="care-subtitle">Dados básicos</h3>
          <div className="care-info-grid single-column">
            <div className="care-info-row"><span>Nome completo:</span><strong>{patient.tutor?.fullName || '—'}</strong></div>
            <div className="care-info-row"><span>CPF:</span><strong>{patient.tutor?.cpf || '—'}</strong></div>
            <div className="care-info-row"><span>Contato:</span><strong>{patient.tutor?.phone || '—'}</strong></div>
            <div className="care-info-row"><span>Email:</span><strong>{patient.tutor?.email || '—'}</strong></div>
            <div className="care-info-row"><span>Convênio:</span><strong>{patient.tutor?.insurance || 'Não possui'}</strong></div>
          </div>

          <h3 className="care-subtitle">Endereço</h3>
          <div className="care-info-grid two-columns">
            <div className="care-info-row"><span>CEP:</span><strong>{address.cep}</strong></div>
            <div className="care-info-row"><span>Logradouro:</span><strong>{address.street}</strong></div>
            <div className="care-info-row"><span>Estado:</span><strong>{address.state}</strong></div>
            <div className="care-info-row"><span>Número:</span><strong>{address.number}</strong></div>
            <div className="care-info-row"><span>Cidade:</span><strong>{address.city}</strong></div>
            <div className="care-info-row"><span>Complemento:</span><strong>{address.complement}</strong></div>
            <div className="care-info-row"><span>Bairro:</span><strong>{address.neighborhood}</strong></div>
          </div>
        </section>
      )}

      {activeTab === 'prontuario' && (
        <section className="care-panel">
          {/* Durante o atendimento a curva é o contexto mais útil do
              histórico: diz se o paciente está perdendo ou ganhando peso. */}
          <WeightEvolutionChart history={visibleHistory} />

          <div className="care-history-table-wrapper">
            <table className="care-history-table">
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
                            className="care-history-action"
                            onClick={() =>
                              navigate(`/historico/${item.id}/pacientes/${patient.id}`, {
                                state: { 
                                  from: `/atendimentos/${appointmentId}/pacientes/${patientId}`,
                                  tab: 'prontuario' 
                                },
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
                    <td colSpan={4} className="care-history-empty">
                      Nenhum prontuário anterior encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showFinalizeModal && (
        <div className="care-modal-overlay" role="presentation">
          <div className="care-modal">
            <FileText className="care-modal-icon pink" />
            <h3>Finalizar atendimento</h3>
            <p>Deseja finalizar esse atendimento? Depois disso a edição ficará bloqueada.</p>
            <div className="care-modal-actions">
              <button type="button" onClick={() => setShowFinalizeModal(false)}>
                Cancelar
              </button>
              <button type="button" className="primary" onClick={() => void handleFinalize()}>
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="care-modal-overlay" role="presentation">
          <div className="care-modal">
            <AlertCircle className="care-modal-icon warn" />
            <h3>Deseja sair?</h3>
            <p>
              {isDirty
                ? 'Você ainda não salvou as alterações deste atendimento. Deseja sair mesmo assim?'
                : 'Deseja sair desse atendimento?'}
            </p>
            <div className="care-modal-actions">
              <button type="button" onClick={() => setShowExitModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="warning"
                onClick={() => {
                  setShowExitModal(false)
                  navigate(-1)
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
