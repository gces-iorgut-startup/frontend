import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer, Share2 } from 'lucide-react'
import { parseRoutineGuidance } from '../../lib/clinicalRecordContent'
import { getErrorMessage } from '../../lib/errorMessage'
import { portalService } from '../../lib/portalService'
import type { Patient, TutorPortalClinicalRecord } from '../../types'
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

function buildExportContent(patient: Patient, record: TutorPortalClinicalRecord) {
  const routineGuidance = parseRoutineGuidance(record.routineGuidance)

  return [
    `Atendimento - ${formatDateTime(record.appointment?.dateTime ?? record.createdAt)}`,
    '',
    `Paciente: ${patient.name}`,
    `Diagnostico: ${record.diagnosis ?? '—'}`,
    '',
    'Diagnostico pendente:',
    record.pendingDiagnosis ?? '—',
    '',
    'Prescricao:',
    record.prescriptions ?? '—',
    '',
    'Recomendacoes:',
    routineGuidance.additionalObservations || routineGuidance.observations || '—',
    '',
    'Resumo IA:',
    record.aiSummary ?? '—',
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

export function TutorPortalHistoryDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { recordId, patientId } = useParams<{ recordId: string; patientId: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [record, setRecord] = useState<TutorPortalClinicalRecord | null>(null)

  const handleBack = () => {
    const from = (location.state as { from?: string })?.from
    if (from) {
      navigate(from)
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/portal/historico')
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
        const response = await portalService.getPatientHistory(patientId)
        const matchedRecord = response.clinicalRecords.find((item) => item.id === recordId)

        if (!matchedRecord) {
          throw new Error('Prontuário não encontrado para este paciente.')
        }

        if (!cancelled) {
          setPatient(response.patient)
          setRecord(matchedRecord)
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
    () =>
      record
        ? parseRoutineGuidance(record.routineGuidance)
        : { observations: '', additionalObservations: '' },
    [record],
  )

  if (loading) {
    return <div className="history-detail-state">Carregando atendimento...</div>
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
          <button type="button" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
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

      <div className="history-detail-content">
        <p className="history-detail-kicker">
          Atendimento - {formatDateTime(record.appointment?.dateTime ?? record.createdAt)}
        </p>

        <InfoBlock title="Diagnóstico provisório / definitivo:" content={record.diagnosis} />
        <InfoBlock title="Pedidos de exame:" content={record.pendingDiagnosis} />
        <InfoBlock title="Medicação / Prescrição:" content={record.prescriptions} />
        <InfoBlock title="Observações:" content={routineGuidance.observations} />
        <InfoBlock
          title="Observações adicionais:"
          content={routineGuidance.additionalObservations}
        />
        <InfoBlock title="Resumo IA:" content={record.aiSummary} />
      </div>
    </div>
  )
}
