import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, HeartPulse, Pencil, Plus, RefreshCw, XCircle } from 'lucide-react'
import { ChronicConditionsService } from '../services/chronicConditions.service'
import { ChronicConditionModal } from './ChronicConditionModal'
import { formatCivilDate } from './chronicConditionDates'
import { getErrorMessage } from '../lib/errorMessage'
import type { ChronicCondition, ChronicConditionStatus } from '../types'

interface ChronicConditionsSectionProps {
  patientId: string
  canEdit?: boolean
}

type ModalState = { mode: 'create' } | { mode: 'edit'; condition: ChronicCondition } | null

const STATUS_BADGES: Record<
  ChronicConditionStatus,
  { label: string; background: string; color: string; border: string; Icon: typeof Circle }
> = {
  ACTIVE: { label: 'Ativa', background: '#fef3c7', color: '#b45309', border: '#fde68a', Icon: Circle },
  INACTIVE: { label: 'Inativa', background: '#f1f5f9', color: '#475569', border: '#e2e8f0', Icon: XCircle },
  RESOLVED: { label: 'Resolvida', background: '#dcfce7', color: '#15803d', border: '#bbf7d0', Icon: CheckCircle2 },
}

function StatusBadge({ status }: { status: ChronicConditionStatus }) {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.ACTIVE
  const { Icon } = badge

  return (
    <span
      data-testid={`chronic-condition-status-${status.toLowerCase()}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: badge.background,
        color: badge.color,
        border: `1px solid ${badge.border}`,
      }}
    >
      <Icon size={13} />
      {badge.label}
    </span>
  )
}

export function ChronicConditionsSection({ patientId, canEdit = true }: ChronicConditionsSectionProps) {
  const [conditions, setConditions] = useState<ChronicCondition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [modal, setModal] = useState<ModalState>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!patientId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    ChronicConditionsService.listByPatient(patientId)
      .then((data) => {
        if (!cancelled) setConditions(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err, 'Erro ao carregar as patologias crônicas.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [patientId, reloadKey])

  function handleSaved(saved: ChronicCondition) {
    const isUpdate = conditions.some((item) => item.id === saved.id)
    setConditions((prev) =>
      isUpdate ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev],
    )
    setSuccessMessage(isUpdate ? 'Patologia atualizada com sucesso.' : 'Patologia registrada com sucesso.')
  }

  function openModal(next: ModalState) {
    setSuccessMessage('')
    setModal(next)
  }

  return (
    <section className="patient-records-panel" aria-label="Seção de Patologias Crônicas">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Patologias Crônicas
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Acompanhe as condições crônicas diagnosticadas para este paciente.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => openModal({ mode: 'create' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--pink-300, #ff4f93)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            <Plus size={16} />
            Registrar Patologia
          </button>
        )}
      </div>

      {successMessage && (
        <p
          role="status"
          data-testid="chronic-conditions-success"
          style={{
            margin: '0 0 12px 0',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '0.875rem',
          }}
        >
          {successMessage}
        </p>
      )}

      {loading && (
        <div
          data-testid="chronic-conditions-loading"
          style={{
            padding: '48px 16px',
            textAlign: 'center',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <RefreshCw className="animate-spin" size={28} color="#94a3b8" />
          <span>Carregando patologias crônicas...</span>
        </div>
      )}

      {error && !loading && (
        <div
          data-testid="chronic-conditions-error"
          role="alert"
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            color: '#b91c1c',
            margin: '12px 0',
          }}
        >
          <p style={{ margin: '0 0 12px 0', fontWeight: 500 }}>{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            style={{
              background: '#fff',
              border: '1px solid #fca5a5',
              padding: '6px 14px',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && conditions.length === 0 && (
        <div
          data-testid="chronic-conditions-empty"
          style={{
            padding: '48px 16px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <HeartPulse size={36} color="#94a3b8" />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
            Nenhuma patologia crônica registrada
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', maxWidth: '360px' }}>
            {canEdit
              ? 'Clique em "Registrar Patologia" para documentar uma condição crônica deste paciente.'
              : 'Este paciente não possui patologias crônicas registradas.'}
          </p>
        </div>
      )}

      {!loading && !error && conditions.length > 0 && (
        <div className="patient-records-table-wrapper">
          <table className="patient-records-table" aria-label="Tabela de Patologias Crônicas">
            <thead>
              <tr>
                <th>Patologia</th>
                <th>Diagnóstico</th>
                <th>Status</th>
                <th>Observações</th>
                {canEdit && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {conditions.map((item) => (
                <tr key={item.id} data-testid={`chronic-condition-row-${item.id}`}>
                  <td style={{ fontWeight: 500, color: '#1e293b' }}>{item.name}</td>
                  <td>{formatCivilDate(item.diagnosedAt)}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ maxWidth: '320px', whiteSpace: 'pre-wrap' }}>
                    {item.observations || <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  {canEdit && (
                    <td>
                      <button
                        type="button"
                        aria-label={`Editar ${item.name}`}
                        onClick={() => openModal({ mode: 'edit', condition: item })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          color: '#334155',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ChronicConditionModal
          patientId={patientId}
          condition={modal.mode === 'edit' ? modal.condition : undefined}
          onClose={() => setModal(null)}
          onSuccess={handleSaved}
        />
      )}
    </section>
  )
}
