import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, FileText, LoaderCircle, Share2 } from 'lucide-react'
import { resolveRecordObservations } from '../../lib/clinicalRecordContent'
import { getErrorMessage } from '../../lib/errorMessage'
import { historyService } from '../../lib/historyService'
import { clinicalService } from '../../lib/clinicalService'
import type { ClinicalHistoryItem, Patient } from '../../types'
import '../../styles/history.css'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildExportContent(patient: Patient, record: ClinicalHistoryItem) {
  const routineGuidance = resolveRecordObservations(record)

  return [
    `Atendimento - ${formatDateTime(record.appointment?.dateTime ?? record.createdAt)}`,
    '',
    `Paciente: ${patient.name}`,
    `Tutor: ${patient.tutor?.fullName ?? '—'}`,
    `Queixa principal: ${record.clinicalNotes ?? '—'}`,
    '',
    'Exame físico:',
    record.breathingNotes ?? '—',
    '',
    'Observações:',
    routineGuidance.observations || '—',
    '',
    'Pedidos de exame:',
    record.pendingDiagnosis ?? '—',
    '',
    'Diagnóstico provisório / definitivo:',
    record.diagnosis ?? '—',
    '',
    'Medicação / Prescrição:',
    record.prescriptions ?? '—',
    '',
    'Observações adicionais:',
    routineGuidance.additionalObservations || '—',
  ].join('\n')
}

function InfoBlock({ title, content }: { title: string; content?: string | null }) {
  return (
    <section className="history-detail-block">
      <h3>{title}</h3>
      <p>{content?.trim() ? content : '—'}</p>
    </section>
  )
}

export function HistoryDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { recordId, patientId } = useParams<{ recordId: string; patientId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [record, setRecord] = useState<ClinicalHistoryItem | null>(null)
  const [prescriptionLoading, setPrescriptionLoading] = useState(false)
  const [prescriptionError, setPrescriptionError] = useState('')

  const handleBack = () => {
    const state = location.state as { from?: string; tab?: string }
    console.log('HistoryDetails handleBack state:', state)
    if (state?.from) {
      navigate(state.from, { state: { tab: state.tab } })
    } else {
      navigate('/historico')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadDetails() {
      if (!recordId || !patientId) {
        setError('Parâmetros inválidos para abrir este atendimento.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const data = await historyService.getHistoryRecordDetail(patientId, recordId)

        if (!cancelled) {
          setPatient(data.patient)
          setRecord(data.record)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Não foi possível carregar os detalhes da consulta.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDetails()

    return () => {
      cancelled = true
    }
  }, [patientId, recordId])

  const exportContent = useMemo(() => {
    if (!patient || !record) return ''
    return buildExportContent(patient, record)
  }, [patient, record])

  const routineGuidance = useMemo(
    () => (record ? resolveRecordObservations(record) : { observations: '', additionalObservations: '' }),
    [record],
  )

  const hasPrescriptionContent = Boolean(record?.prescriptions?.trim())

  async function handleGeneratePrescription() {
    if (!record) return
    setPrescriptionLoading(true)
    setPrescriptionError('')
    try {
      const blob = await clinicalService.getPrescriptionPdf(record.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: unknown) {
      setPrescriptionError(getErrorMessage(err, 'Não foi possível gerar a receita.'))
    } finally {
      setPrescriptionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="history-detail-state">
        <LoaderCircle className="care-spin" />
      </div>
    )
  }

  if (error || !patient || !record) {
    return <div className="history-detail-state">{error || 'Atendimento não encontrado.'}</div>
  }

  return (
    <div className="history-detail-page">
      <div className="history-detail-topbar">
        <button className="care-back-button" type="button" onClick={handleBack}>
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="history-detail-actions">
          <button
            type="button"
            onClick={handleGeneratePrescription}
            disabled={!hasPrescriptionContent || prescriptionLoading}
            title={
              hasPrescriptionContent
                ? 'Gerar PDF da receita'
                : 'Adicione uma prescrição para gerar a receita'
            }
          >
            {prescriptionLoading ? (
              <LoaderCircle size={16} className="care-spin" />
            ) : (
              <FileText size={16} />
            )}
            {prescriptionLoading ? 'Gerando…' : 'Gerar Receita'}
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `atendimento-${patient.name.toLowerCase().replace(/\s+/g, '-')}.txt`,
                exportContent,
              )
            }
          >
            <Share2 size={16} />
            Exportar
          </button>
        </div>
      </div>

      {prescriptionError && (
        <div className="history-detail-error">{prescriptionError}</div>
      )}

      <div className="history-detail-content">
        <p className="history-detail-kicker">
          Atendimento - {formatDateTime(record.appointment?.dateTime ?? record.createdAt)}
        </p>

        <InfoBlock title="Queixa principal:" content={record.clinicalNotes} />
        <InfoBlock title="Exame físico:" content={record.breathingNotes} />
        <InfoBlock title="Observações:" content={routineGuidance.observations} />
        <InfoBlock title="Pedidos de exame:" content={record.pendingDiagnosis} />
        <InfoBlock title="Diagnóstico provisório / definitivo:" content={record.diagnosis} />
        <InfoBlock title="Medicação / Prescrição:" content={record.prescriptions} />
        <InfoBlock title="Observações adicionais:" content={routineGuidance.additionalObservations} />
      </div>
    </div>
  )
}
