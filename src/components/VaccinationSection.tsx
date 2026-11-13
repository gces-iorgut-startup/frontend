import { useEffect, useState, useCallback } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Clock, Plus, RefreshCw, Syringe } from 'lucide-react'
import { VaccinationsService } from '../services/vaccinations.service'
import { RegisterVaccinationModal } from './RegisterVaccinationModal'
import { getErrorMessage } from '../lib/errorMessage'
import type { Vaccination, VaccinationStatus } from '../types'

interface VaccinationSectionProps {
  patientId: string
  canRegister?: boolean
}

export function VaccinationSection({ patientId, canRegister = true }: VaccinationSectionProps) {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadVaccinations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await VaccinationsService.listByPatient(patientId)
      setVaccinations(data)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao carregar o cronograma de vacinação.'))
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (patientId) {
      loadVaccinations()
    }
  }, [loadVaccinations, patientId])

  function handleVaccinationCreated(newVaccination: Vaccination) {
    setVaccinations((prev) => [newVaccination, ...prev])
  }

  function formatDate(value?: string | null) {
    if (!value) return '—'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '—'
    return parsed.toLocaleDateString('pt-BR')
  }

  function renderStatusBadge(status: VaccinationStatus) {
    switch (status) {
      case 'UP_TO_DATE':
        return (
          <span
            data-testid="badge-up-to-date"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #bbf7d0',
            }}
          >
            <CheckCircle2 size={13} />
            Em dia
          </span>
        )
      case 'PENDING':
        return (
          <span
            data-testid="badge-pending"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            <Clock size={13} />
            Pendente
          </span>
        )
      case 'OVERDUE':
        return (
          <span
            data-testid="badge-overdue"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
          >
            <AlertCircle size={13} />
            Atrasada
          </span>
        )
    }
  }

  return (
    <section className="patient-records-panel" aria-label="Seção de Vacinação">
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
            Controle e Cronograma de Vacinação
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Acompanhe as doses aplicadas e as próximas doses calculadas pelo esquema vacinal.
          </p>
        </div>

        {canRegister && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
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
            Registrar Vacina
          </button>
        )}
      </div>

      {loading && (
        <div
          data-testid="vaccinations-loading"
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
          <span>Carregando cronograma de vacinação...</span>
        </div>
      )}

      {error && !loading && (
        <div
          data-testid="vaccinations-error"
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
            onClick={loadVaccinations}
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

      {!loading && !error && vaccinations.length === 0 && (
        <div
          data-testid="vaccinations-empty"
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
          <Syringe size={36} color="#94a3b8" />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#334155' }}>
            Nenhuma vacina registrada
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', maxWidth: '360px' }}>
            O paciente ainda não possui doses no histórico. Clique em "Registrar Vacina" para iniciar o cronograma.
          </p>
        </div>
      )}

      {!loading && !error && vaccinations.length > 0 && (
        <div className="patient-records-table-wrapper">
          <table className="patient-records-table" aria-label="Tabela de Vacinas">
            <thead>
              <tr>
                <th>Vacina</th>
                <th>Dose</th>
                <th>Data da Aplicação</th>
                <th>Intervalo</th>
                <th>Próxima Dose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vaccinations.map((vac) => {
                const isOverdue = vac.status === 'OVERDUE'
                return (
                  <tr
                    key={vac.id}
                    data-testid={`vaccination-row-${vac.id}`}
                    className={isOverdue ? 'vaccination-row-overdue' : undefined}
                    style={
                      isOverdue
                        ? {
                            backgroundColor: '#fef2f2',
                          }
                        : undefined
                    }
                  >
                    <td style={{ fontWeight: 500, color: isOverdue ? '#991b1b' : '#1e293b' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {isOverdue && (
                          <AlertCircle size={15} color="#dc2626" data-testid={`alert-icon-${vac.id}`} />
                        )}
                        <span>{vac.vaccineName}</span>
                      </div>
                    </td>
                    <td>
                      {vac.doseNumber ? (
                        <span style={{ fontWeight: 500 }}>{vac.doseNumber}ª dose</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Dose única</span>
                      )}
                    </td>
                    <td>{formatDate(vac.appliedAt)}</td>
                    <td>
                      {vac.intervalDays ? (
                        <span>{vac.intervalDays} dias</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>
                      {vac.nextDoseAt ? (
                        <span
                          style={{
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: isOverdue ? '#dc2626' : '#0f172a',
                          }}
                        >
                          <Calendar size={14} color={isOverdue ? '#dc2626' : '#64748b'} />
                          {formatDate(vac.nextDoseAt)}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>{renderStatusBadge(vac.status)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <RegisterVaccinationModal
          patientId={patientId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleVaccinationCreated}
        />
      )}
    </section>
  )
}
