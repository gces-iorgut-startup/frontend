import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AlertCircle,
  Calendar,
  Clock,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Syringe,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { VaccinationAlertsService } from '../../services/vaccinationAlerts.service'
import { ScheduleModal } from '../../components/scheduling/ScheduleModal'
import { getPatientSpeciesLabel } from '../../lib/patientFields'
import { getErrorMessage } from '../../lib/errorMessage'
import type { VaccinationAlertItem, VaccinationAlertStatus } from '../../types'
import '../../styles/patients.css'

export function VaccinationAlertsPage() {
  const user = useAuthStore((s) => s.user)
  const clinicId = user?.clinicId

  const [alerts, setAlerts] = useState<VaccinationAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'ALL' | VaccinationAlertStatus>('ALL')
  const [daysFilter, setDaysFilter] = useState<number>(15)
  const [searchTerm, setSearchTerm] = useState('')

  // Estado do Modal de Agendamento
  const [selectedAlertForSchedule, setSelectedAlertForSchedule] =
    useState<VaccinationAlertItem | null>(null)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)

  const loadAlerts = useCallback(async () => {
    if (!clinicId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await VaccinationAlertsService.listByClinic(clinicId, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        days: daysFilter,
      })
      setAlerts(response.items || [])
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, 'Não foi possível carregar os alertas de vacinação.')
      )
    } finally {
      setLoading(false)
    }
  }, [clinicId, statusFilter, daysFilter])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  const filteredAlerts = useMemo(() => {
    if (!searchTerm.trim()) return alerts

    const term = searchTerm.toLowerCase().trim()
    return alerts.filter(
      (item) =>
        item.patient.name.toLowerCase().includes(term) ||
        item.tutor.fullName.toLowerCase().includes(term) ||
        item.vaccineName.toLowerCase().includes(term)
    )
  }, [alerts, searchTerm])

  const overdueCount = useMemo(
    () => alerts.filter((item) => item.status === 'OVERDUE').length,
    [alerts]
  )

  const upcomingCount = useMemo(
    () => alerts.filter((item) => item.status === 'UPCOMING').length,
    [alerts]
  )

  function formatDate(value?: string | null) {
    if (!value) return '—'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '—'
    return parsed.toLocaleDateString('pt-BR')
  }

  function formatWhatsAppLink(phone: string, petName: string, vaccineName: string) {
    const cleanPhone = phone.replace(/\D/g, '')
    const fullNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
    const message = encodeURIComponent(
      `Olá! Aqui é da clínica veterinária. Notamos que a vacina ${vaccineName} do(a) ${petName} está pendente para renovação. Gostaria de agendar uma aplicação?`
    )
    return `https://wa.me/${fullNumber}?text=${message}`
  }

  function handleOpenSchedule(alert: VaccinationAlertItem) {
    setSelectedAlertForSchedule(alert)
    setIsScheduleModalOpen(true)
  }

  return (
    <div className="patients-page" data-testid="vaccination-alerts-page">
      <header className="patients-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <Syringe size={26} color="var(--pink-300, #ff4f93)" />
            Alertas de Vacinação
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Painel de vacinas atrasadas e a vencer para contato proativo com tutores e agendamento rápido.
          </p>
        </div>
      </header>

      {/* Cards de Resumo */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          data-testid="summary-card-overdue"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={20} color="#dc2626" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>
              Atrasadas
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#b91c1c' }}>
              {overdueCount}
            </div>
          </div>
        </div>

        <div
          data-testid="summary-card-upcoming"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={20} color="#d97706" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
              Próximas do Vencimento
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#d97706' }}>
              {upcomingCount}
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Filtros */}
      <section
        style={{
          backgroundColor: '#fff',
          border: '1px solid var(--gray-200, #e2e8f0)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
            Status:
          </span>
          <button
            type="button"
            data-testid="filter-status-all"
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              border:
                statusFilter === 'ALL'
                  ? '1px solid var(--pink-300, #ff4f93)'
                  : '1px solid #cbd5e1',
              backgroundColor: statusFilter === 'ALL' ? 'var(--pink-300, #ff4f93)' : '#fff',
              color: statusFilter === 'ALL' ? '#fff' : '#475569',
            }}
          >
            Todos
          </button>
          <button
            type="button"
            data-testid="filter-status-overdue"
            onClick={() => setStatusFilter('OVERDUE')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              border:
                statusFilter === 'OVERDUE'
                  ? '1px solid #dc2626'
                  : '1px solid #cbd5e1',
              backgroundColor: statusFilter === 'OVERDUE' ? '#dc2626' : '#fff',
              color: statusFilter === 'OVERDUE' ? '#fff' : '#475569',
            }}
          >
            Apenas Atrasadas
          </button>
          <button
            type="button"
            data-testid="filter-status-upcoming"
            onClick={() => setStatusFilter('UPCOMING')}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              border:
                statusFilter === 'UPCOMING'
                  ? '1px solid #d97706'
                  : '1px solid #cbd5e1',
              backgroundColor: statusFilter === 'UPCOMING' ? '#d97706' : '#fff',
              color: statusFilter === 'UPCOMING' ? '#fff' : '#475569',
            }}
          >
            Apenas A Vencer
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.875rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Limiar:</span>
            <select
              data-testid="filter-days-select"
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#1e293b',
              }}
            >
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
            </select>
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 8px',
            }}
          >
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              data-testid="search-alerts-input"
              placeholder="Buscar pet, tutor, vacina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.85rem',
                color: '#1e293b',
                minWidth: '180px',
              }}
            />
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      {loading && (
        <div
          data-testid="alerts-loading"
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
          <span>Carregando alertas de vacinação...</span>
        </div>
      )}

      {error && !loading && (
        <div
          data-testid="alerts-error"
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
          <p style={{ margin: 0 }}>{error}</p>
          <button
            type="button"
            onClick={loadAlerts}
            style={{
              marginTop: '12px',
              padding: '6px 14px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && filteredAlerts.length === 0 && (
        <div
          data-testid="alerts-empty"
          style={{
            padding: '48px 16px',
            textAlign: 'center',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#64748b',
          }}
        >
          <Syringe size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: 0 }}>
            Nenhum alerta de vacinação pendente
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
            Todas as vacinas estão em dia para os filtros aplicados.
          </p>
        </div>
      )}

      {!loading && !error && filteredAlerts.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <table className="patient-records-table" aria-label="Tabela de Alertas de Vacinação">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Tutor e Contato</th>
                <th>Vacina e Dose</th>
                <th>Data Prevista</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => {
                const isOverdue = alert.status === 'OVERDUE'
                return (
                  <tr
                    key={alert.id}
                    data-testid={`alert-row-${alert.id}`}
                    style={{
                      backgroundColor: isOverdue ? '#fff1f2' : undefined,
                    }}
                  >
                    {/* Paciente */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {alert.patient.name}
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                        }}
                      >
                        {getPatientSpeciesLabel(alert.patient.species)}
                      </span>
                    </td>

                    {/* Tutor */}
                    <td>
                      <div style={{ fontWeight: 500, color: '#334155' }}>
                        {alert.tutor.fullName}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '4px',
                          fontSize: '0.8rem',
                          color: '#64748b',
                        }}
                      >
                        <span>{alert.tutor.phone}</span>
                        {alert.tutor.phone && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <a
                              href={formatWhatsAppLink(
                                alert.tutor.phone,
                                alert.patient.name,
                                alert.vaccineName
                              )}
                              target="_blank"
                              rel="noreferrer"
                              title="Conversar no WhatsApp"
                              data-testid={`whatsapp-link-${alert.id}`}
                              style={{
                                color: '#16a34a',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <MessageCircle size={15} />
                            </a>
                            <a
                              href={`tel:${alert.tutor.phone.replace(/\D/g, '')}`}
                              title="Ligar para tutor"
                              data-testid={`phone-link-${alert.id}`}
                              style={{
                                color: '#2563eb',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Phone size={15} />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Vacina e Dose */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {alert.vaccineName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {alert.doseNumber ? `${alert.doseNumber}ª dose` : 'Dose única / Reforço'}
                      </div>
                    </td>

                    {/* Data Prevista */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 500,
                          color: isOverdue ? '#dc2626' : '#334155',
                        }}
                      >
                        <Calendar size={14} color={isOverdue ? '#dc2626' : '#64748b'} />
                        {formatDate(alert.nextDoseAt)}
                      </span>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: isOverdue ? '#b91c1c' : '#d97706',
                          marginTop: '2px',
                        }}
                      >
                        {isOverdue
                          ? `${alert.daysOverdue ?? alert.daysDifference} dias em atraso`
                          : `Vence em ${alert.daysUntilDue ?? alert.daysDifference} dias`}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {isOverdue ? (
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
                            border: '1px solid #fca5a5',
                          }}
                        >
                          <AlertCircle size={13} />
                          Atrasada
                        </span>
                      ) : (
                        <span
                          data-testid="badge-upcoming"
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
                          A Vencer
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td>
                      <button
                        type="button"
                        data-testid={`schedule-btn-${alert.id}`}
                        onClick={() => handleOpenSchedule(alert)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'var(--pink-300, #ff4f93)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Calendar size={13} />
                        Agendar Aplicação
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Agendamento Pré-configurado */}
      {isScheduleModalOpen && selectedAlertForSchedule && (
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          initialTutorId={selectedAlertForSchedule.tutor.id}
          initialPatientId={selectedAlertForSchedule.patient.id}
          initialCategory="VACCINATION"
          onClose={() => {
            setIsScheduleModalOpen(false)
            setSelectedAlertForSchedule(null)
          }}
          onSuccess={() => {
            setIsScheduleModalOpen(false)
            setSelectedAlertForSchedule(null)
            void loadAlerts()
          }}
        />
      )}
    </div>
  )
}
