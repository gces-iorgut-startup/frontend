import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, BarChart3, CalendarDays, ChevronRight, Clock3, LoaderCircle, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { DashboardService } from '../../services/dashboard.service'
import { VaccinationAlertsWidget } from '../../components/VaccinationAlertsWidget'
import type { AdminAppointmentsTrendPoint, AdminMetrics, RecentActivities } from '../../types'
import '../../styles/dashboard.css'

type PeriodFilter = 'week' | 'month'
type DetailFilter = 'status' | 'category'

function formatDayLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return dateString

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatActivityDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week')
  const [detailFilter, setDetailFilter] = useState<DetailFilter>('status')
  const [days, setDays] = useState(30)
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [trend, setTrend] = useState<AdminAppointmentsTrendPoint[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivities>({
    recentAppointments: [],
    recentPatients: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [metricsResponse, trendResponse, activitiesResponse] = await Promise.all([
          DashboardService.getAdminMetrics(),
          DashboardService.getAdminAppointmentsTrend(days),
          DashboardService.getRecentActivities(5),
        ])

        if (cancelled) return

        setMetrics(metricsResponse)
        setTrend(trendResponse.trend)
        setRecentActivities(activitiesResponse)
      } catch {
        if (!cancelled) {
          setError('Nao foi possivel carregar os indicadores gerenciais.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [days])

  const maxValue = useMemo(() => {
    if (trend.length === 0) return 1
    return Math.max(...trend.map((point) => point.totalAppointments), 1)
  }, [trend])

  const periodTotal = useMemo(
    () => trend.reduce((sum, point) => sum + point.totalAppointments, 0),
    [trend]
  )

  const periodMetrics = useMemo(
    () => (periodFilter === 'week' ? metrics?.week : metrics?.month),
    [metrics, periodFilter]
  )

  const periodCategories = useMemo(
    () => (periodFilter === 'week' ? metrics?.categories.week : metrics?.categories.month),
    [metrics, periodFilter]
  )

  const activePeriodTotal = useMemo(() => {
    if (!periodMetrics) return 0
    return periodMetrics.scheduled + periodMetrics.inProgress + periodMetrics.completed
  }, [periodMetrics])

  const periodLabel = periodFilter === 'week' ? 'semana' : 'mes'

  const activityItems = useMemo(() => [
    ...recentActivities.recentAppointments.map(activity => ({
      key: `appointment-${activity.id}`,
      title: `Atendimento de ${activity.patientName} alterado`,
      detail: 'Atendimento alterado',
      timestamp: activity.updatedAt,
      onClick: () => navigate(`/atendimentos/${activity.id}/pacientes/${activity.patientId}`),
    })),
    ...recentActivities.recentPatients.map(activity => ({
      key: `patient-${activity.id}`,
      title: `${activity.name} cadastrado`,
      detail: `Tutor: ${activity.tutorName}`,
      timestamp: activity.createdAt,
      onClick: () => navigate(`/pacientes/${activity.id}`),
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [navigate, recentActivities])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <LoaderCircle className="dashboard-spin" size={36} />
        <span>Carregando indicadores...</span>
      </div>
    )
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>Painel Gerencial</h1>
        <p>Indicadores essenciais com filtros para leitura rapida.</p>
      </header>

      <section className="dashboard-filters-card">
        <div className="dashboard-filter-group">
          <span>Periodo</span>
          <div className="dashboard-chip-group">
            <button
              type="button"
              className={`dashboard-chip ${periodFilter === 'week' ? 'active' : ''}`}
              onClick={() => setPeriodFilter('week')}
            >
              Semana
            </button>
            <button
              type="button"
              className={`dashboard-chip ${periodFilter === 'month' ? 'active' : ''}`}
              onClick={() => setPeriodFilter('month')}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="dashboard-filter-group">
          <span>Detalhe</span>
          <div className="dashboard-chip-group">
            <button
              type="button"
              className={`dashboard-chip ${detailFilter === 'status' ? 'active' : ''}`}
              onClick={() => setDetailFilter('status')}
            >
              Status
            </button>
            <button
              type="button"
              className={`dashboard-chip ${detailFilter === 'category' ? 'active' : ''}`}
              onClick={() => setDetailFilter('category')}
            >
              Categorias
            </button>
          </div>
        </div>

        <label className="dashboard-filter dashboard-filter-inline">
          Historico
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </label>
      </section>

      <section className="dashboard-metrics-grid dashboard-metrics-grid-simple">
        <article className="dashboard-metric-card">
          <div className="dashboard-metric-icon"><Users size={20} /></div>
          <div>
            <span className="dashboard-metric-label">Pacientes cadastrados</span>
            <strong className="dashboard-metric-value">{metrics?.totalPatients ?? 0}</strong>
          </div>
        </article>

        <article className="dashboard-metric-card">
          <div className="dashboard-metric-icon"><CalendarDays size={20} /></div>
          <div>
            <span className="dashboard-metric-label">Atendimentos ativos na {periodLabel}</span>
            <strong className="dashboard-metric-value">{activePeriodTotal}</strong>
          </div>
        </article>

        <article className="dashboard-metric-card">
          <div className="dashboard-metric-icon"><BarChart3 size={20} /></div>
          <div>
            <span className="dashboard-metric-label">Cancelados na {periodLabel}</span>
            <strong className="dashboard-metric-value">{periodMetrics?.cancelled ?? 0}</strong>
          </div>
        </article>

        <article className="dashboard-metric-card">
          <div className="dashboard-metric-icon"><TrendingDown size={20} /></div>
          <div>
            <span className="dashboard-metric-label">Atendimentos passados</span>
            <strong className="dashboard-metric-value">{metrics?.timeline.past ?? 0}</strong>
          </div>
        </article>

        <article className="dashboard-metric-card">
          <div className="dashboard-metric-icon"><TrendingUp size={20} /></div>
          <div>
            <span className="dashboard-metric-label">Atendimentos futuros</span>
            <strong className="dashboard-metric-value">{metrics?.timeline.future ?? 0}</strong>
          </div>
        </article>
      </section>

      <section className="dashboard-details-grid dashboard-details-grid-simple">
        <article className="dashboard-detail-card">
          <h2>
            {detailFilter === 'status' ? 'Detalhamento por status' : 'Detalhamento por categoria'} ({periodLabel})
          </h2>
          <div className="dashboard-detail-list">
            {detailFilter === 'status' ? (
              <>
                <div><span>Agendados</span><strong>{periodMetrics?.scheduled ?? 0}</strong></div>
                <div><span>Em andamento</span><strong>{periodMetrics?.inProgress ?? 0}</strong></div>
                <div><span>Realizados</span><strong>{periodMetrics?.completed ?? 0}</strong></div>
                <div><span>Cancelados</span><strong>{periodMetrics?.cancelled ?? 0}</strong></div>
              </>
            ) : (
              <>
                <div><span>Consulta</span><strong>{periodCategories?.observation ?? 0}</strong></div>
                <div><span>Vacina</span><strong>{periodCategories?.vaccination ?? 0}</strong></div>
                <div><span>Exame</span><strong>{periodCategories?.exam ?? 0}</strong></div>
                <div><span>Cirurgia</span><strong>{periodCategories?.surgical ?? 0}</strong></div>
              </>
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-chart-card">
        <div className="dashboard-chart-header">
          <div>
            <h2>Atendimentos por dia</h2>
            <p>{periodTotal} atendimentos nos ultimos {days} dias</p>
          </div>
        </div>

        {trend.length === 0 ? (
          <div className="dashboard-empty-state">Nenhum atendimento registrado no periodo.</div>
        ) : (
          <div className="dashboard-bars-grid">
            {trend.map((point) => {
              const height = (point.totalAppointments / maxValue) * 100

              return (
                <div key={point.date} className="dashboard-bar-item" title={`${point.totalAppointments} atendimentos`}>
                  <div className="dashboard-bar-track">
                    <div className="dashboard-bar-fill" style={{ height: `${height}%` }} />
                  </div>
                  <span className="dashboard-bar-value">{point.totalAppointments}</span>
                  <span className="dashboard-bar-label">{formatDayLabel(point.date)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <VaccinationAlertsWidget days={7} />

      <section className="dashboard-activity-card">
        <div className="dashboard-activity-header">
          <div>
            <h2><Activity size={20} /> Atividades recentes</h2>
            <p>Últimos pacientes cadastrados e atendimentos modificados.</p>
          </div>
        </div>

        {activityItems.length === 0 ? (
          <div className="dashboard-empty-state">Nenhuma atividade recente encontrada.</div>
        ) : (
          <div className="dashboard-activity-list">
            {activityItems.map(item => (
              <button key={item.key} type="button" className="dashboard-activity-item" onClick={item.onClick}>
                <span className="dashboard-activity-icon"><Clock3 size={17} /></span>
                <span className="dashboard-activity-content">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </span>
                <time dateTime={item.timestamp}>{formatActivityDate(item.timestamp)}</time>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
