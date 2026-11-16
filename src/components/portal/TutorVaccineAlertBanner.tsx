import { AlertCircle, Calendar, Syringe } from 'lucide-react'
import type { TutorAlert } from '../../types'

interface TutorVaccineAlertBannerProps {
  alerts: TutorAlert[]
  onRequestAppointment: (alert: TutorAlert) => void
}

function formatDate(value?: string | null) {
  if (!value) return 'data a definir'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'data a definir'
  return parsed.toLocaleDateString('pt-BR')
}

export function TutorVaccineAlertBanner({
  alerts,
  onRequestAppointment,
}: TutorVaccineAlertBannerProps) {
  const vaccineAlerts = alerts.filter(
    (a) => a.type === 'overdue_vaccine' || a.type === 'upcoming_vaccine'
  )

  if (vaccineAlerts.length === 0) {
    return null
  }

  return (
    <div
      data-testid="tutor-vaccine-alert-banner"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '20px',
      }}
    >
      {vaccineAlerts.map((alert, index) => {
        const isOverdue = alert.type === 'overdue_vaccine'
        const key = `${alert.patientName}-${alert.vaccineName || index}-${alert.date || index}`
        const doseText = alert.doseNumber ? ` (Dose ${alert.doseNumber})` : ''
        const vaccineLabel = alert.vaccineName ? `${alert.vaccineName}${doseText}` : 'Pendente'

        return (
          <div
            key={key}
            data-testid={`tutor-alert-card-${index}`}
            style={{
              backgroundColor: isOverdue ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${isOverdue ? '#fca5a5' : '#fde68a'}`,
              borderLeft: `5px solid ${isOverdue ? '#dc2626' : '#d97706'}`,
              borderRadius: '8px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: isOverdue ? '#fee2e2' : '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isOverdue ? (
                  <AlertCircle size={20} color="#dc2626" />
                ) : (
                  <Calendar size={20} color="#d97706" />
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: isOverdue ? '#fee2e2' : '#fef3c7',
                      color: isOverdue ? '#b91c1c' : '#92400e',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isOverdue ? 'Vacina Atrasada' : 'Próxima Dose'}
                  </span>
                </div>

                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.92rem',
                    color: '#1e293b',
                    fontWeight: 500,
                  }}
                >
                  Seu pet <strong>{alert.patientName}</strong> tem uma vacina (
                  <strong>{vaccineLabel}</strong>) com dose prevista para{' '}
                  <strong>{formatDate(alert.date)}</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid={`btn-request-schedule-${index}`}
              onClick={() => onRequestAppointment(alert)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--pink-300, #ff4f93)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <Syringe size={16} />
              <span>Solicitar Agendamento</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
