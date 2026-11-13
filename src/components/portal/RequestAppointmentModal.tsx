import { useState, useEffect } from 'react'
import { CheckCircle2, RefreshCw, X, Syringe } from 'lucide-react'
import { portalService } from '../../lib/portalService'
import { getErrorMessage } from '../../lib/errorMessage'
import type { AppointmentCategory } from '../../types'
import '../../styles/modal.css'

interface RequestAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  patientId: string
  patientName: string
  vaccineName?: string
  initialCategory?: AppointmentCategory
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
]

export function RequestAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
  vaccineName,
  initialCategory = 'VACCINATION',
}: RequestAppointmentModalProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [observation, setObservation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (isOpen) {
      setDate(todayStr)
      setTime('09:00')
      setObservation(
        vaccineName ? `Aplicação de vacina: ${vaccineName}` : 'Aplicação de vacina'
      )
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, vaccineName, todayStr])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !time) {
      setError('Por favor, escolha uma data e horário.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const dateTime = new Date(`${date}T${time}:00`).toISOString()
      await portalService.requestAppointment({
        patientId,
        category: initialCategory,
        dateTime,
        observation: observation.trim() || undefined,
      })
      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erro ao solicitar agendamento. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" data-testid="request-appointment-modal">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Syringe size={22} color="var(--pink-300, #ff4f93)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
              Solicitar Agendamento
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div
            data-testid="request-success"
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: '#16a34a',
            }}
          >
            <CheckCircle2 size={44} color="#16a34a" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              Solicitação Enviada com Sucesso!
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              A clínica confirmará o horário em breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div
                data-testid="request-error"
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Paciente
              </label>
              <input
                type="text"
                disabled
                value={patientName}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#1e293b',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Categoria
              </label>
              <input
                type="text"
                disabled
                value="Vacinação"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#1e293b',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Data Preferencial
                </label>
                <input
                  type="date"
                  min={todayStr}
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Horário
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                  }}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Observações (Opcional)
              </label>
              <textarea
                rows={3}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Informar preferências de atendimento ou vacina específica..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--pink-300, #ff4f93)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {loading && <RefreshCw size={16} className="animate-spin" />}
                <span>Solicitar Agendamento</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
