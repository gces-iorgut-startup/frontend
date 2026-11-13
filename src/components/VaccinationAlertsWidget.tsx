import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Calendar, ChevronRight, RefreshCw, Syringe } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { VaccinationAlertsService } from '../services/vaccinationAlerts.service'
import type { VaccinationAlertItem } from '../types'
import { getErrorMessage } from '../lib/errorMessage'

interface VaccinationAlertsWidgetProps {
  days?: number
}

export function VaccinationAlertsWidget({ days = 7 }: VaccinationAlertsWidgetProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clinicId = user?.clinicId

  const [alerts, setAlerts] = useState<VaccinationAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!clinicId) {
      setLoading(false)
      return
    }

    async function loadAlerts() {
      setLoading(true)
      setError(null)
      try {
        const response = await VaccinationAlertsService.listByClinic(clinicId!, { days })
        if (!cancelled) {
          setAlerts(response.items || [])
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Não foi possível carregar os alertas de vacinação.'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAlerts()

    return () => {
      cancelled = true
    }
  }, [clinicId, days])

  const overdueCount = useMemo(
    () => alerts.filter((item) => item.status === 'OVERDUE').length,
    [alerts]
  )

  const upcomingCount = useMemo(
    () => alerts.filter((item) => item.status === 'UPCOMING').length,
    [alerts]
  )

  const totalAlerts = overdueCount + upcomingCount

  return (
    <section
      data-testid="vaccination-alerts-widget"
      className="dashboard-activity-card"
      style={{ marginTop: 0 }}
    >
      <div
        className="dashboard-activity-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Syringe size={20} color="var(--pink-300, #ff4f93)" />
            Alertas de Vacinação
          </h2>
          <p>Acompanhamento de vacinas atrasadas e a vencer na semana.</p>
        </div>

        <button
          type="button"
          data-testid="view-all-alerts-button"
          onClick={() => navigate('/vacinas/alertas')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: '1px solid var(--gray-300, #cbd5e1)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--gray-700, #334155)',
            cursor: 'pointer',
          }}
        >
          <span>Ver todos os alertas</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {loading && (
        <div
          data-testid="widget-loading"
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <RefreshCw className="animate-spin" size={20} />
          <span>Carregando alertas vacinais...</span>
        </div>
      )}

      {error && !loading && (
        <div
          data-testid="widget-error"
          style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.875rem',
            margin: '12px 0',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {/* Card Atrasadas */}
            <div
              data-testid="widget-overdue-box"
              style={{
                backgroundColor: overdueCount > 0 ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${overdueCount > 0 ? '#fecaca' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: overdueCount > 0 ? '#fee2e2' : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle
                  size={22}
                  color={overdueCount > 0 ? '#dc2626' : '#94a3b8'}
                />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: overdueCount > 0 ? '#991b1b' : '#64748b',
                    fontWeight: 500,
                  }}
                >
                  Vacinas Atrasadas
                </span>
                <div
                  data-testid="overdue-count"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: overdueCount > 0 ? '#b91c1c' : '#1e293b',
                    lineHeight: 1.2,
                  }}
                >
                  {overdueCount}
                </div>
              </div>
            </div>

            {/* Card A Vencer na Semana */}
            <div
              data-testid="widget-upcoming-box"
              style={{
                backgroundColor: upcomingCount > 0 ? '#fffbeb' : '#f8fafc',
                border: `1px solid ${upcomingCount > 0 ? '#fde68a' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: upcomingCount > 0 ? '#fef3c7' : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar
                  size={22}
                  color={upcomingCount > 0 ? '#d97706' : '#94a3b8'}
                />
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: upcomingCount > 0 ? '#92400e' : '#64748b',
                    fontWeight: 500,
                  }}
                >
                  A Vencer na Semana ({days}d)
                </span>
                <div
                  data-testid="upcoming-count"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: upcomingCount > 0 ? '#d97706' : '#1e293b',
                    lineHeight: 1.2,
                  }}
                >
                  {upcomingCount}
                </div>
              </div>
            </div>
          </div>

          {totalAlerts === 0 && (
            <div
              data-testid="widget-empty-message"
              style={{
                marginTop: '12px',
                padding: '12px 14px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#15803d',
                textAlign: 'center',
              }}
            >
              Nenhuma vacina atrasada ou a vencer nos próximos {days} dias. O cronograma vacinal está em dia!
            </div>
          )}
        </div>
      )}
    </section>
  )
}
