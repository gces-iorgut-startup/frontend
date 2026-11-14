import type { HospitalizationStatus } from '../types'

export const HOSPITALIZATION_STATUS_LABELS: Record<HospitalizationStatus, string> = {
  ADMITTED: 'Internado',
  CRITICAL: 'Crítico',
  DISCHARGED: 'Alta concedida',
}

export function getHospitalizationStatusLabel(status: string): string {
  return HOSPITALIZATION_STATUS_LABELS[status as HospitalizationStatus] ?? status
}

/**
 * Tempo de internação em texto curto, para o cabeçalho e os cards.
 *
 * Conta até a alta quando ela existe; senão, até agora. Abaixo de uma hora
 * mostramos minutos, porque recém-admitido com "0h" parece erro de cálculo.
 */
export function formatHospitalizationDuration(
  admittedAt: string,
  dischargedAt?: string | null,
  now: Date = new Date()
): string {
  const start = new Date(admittedAt)
  if (Number.isNaN(start.getTime())) return '—'

  const end = dischargedAt ? new Date(dischargedAt) : now
  if (Number.isNaN(end.getTime())) return '—'

  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000)
  if (totalMinutes < 0) return '—'
  if (totalMinutes < 60) return `${totalMinutes}min`

  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) {
    const minutes = totalMinutes % 60
    return minutes ? `${totalHours}h ${minutes}min` : `${totalHours}h`
  }

  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`
  return hours ? `${dayLabel} ${hours}h` : dayLabel
}

/** "13/11/2026 às 15:30" — formato usado na timeline e nos cards. */
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/** Só a hora, para a coluna esquerda da timeline. */
export function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Converte o que foi digitado num sinal vital.
 *
 * Campo vazio devolve `undefined` para o payload omitir a chave — sinal vital
 * em branco significa "não aferi", não zero. Aceita vírgula porque o teclado
 * numérico em pt-BR produz "38,5" e `Number('38,5')` é NaN. Devolve `null`
 * quando o texto não vira número, para o formulário poder acusar o erro.
 */
export function parseVitalSign(value: string): number | undefined | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return undefined

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null

  return parsed
}

/**
 * Mesmas faixas do Zod no backend. Repetidas aqui de propósito: o objetivo é
 * avisar antes de gastar uma requisição, não substituir a validação do servidor.
 */
export const VITAL_SIGN_RANGES = {
  temperature: { min: 20, max: 50, label: 'Temperatura', unit: '°C' },
  heartRate: { min: 10, max: 400, label: 'Frequência cardíaca', unit: 'bpm' },
  respiratoryRate: { min: 2, max: 200, label: 'Frequência respiratória', unit: 'mpm' },
} as const

export type VitalSignField = keyof typeof VITAL_SIGN_RANGES

export function getVitalSignError(field: VitalSignField, value: string): string | null {
  const parsed = parseVitalSign(value)
  if (parsed === undefined) return null

  const range = VITAL_SIGN_RANGES[field]
  if (parsed === null) return `${range.label} deve ser um número.`

  if (field !== 'temperature' && !Number.isInteger(parsed)) {
    return `${range.label} deve ser um número inteiro.`
  }

  if (parsed < range.min || parsed > range.max) {
    return `${range.label} deve ficar entre ${range.min} e ${range.max} ${range.unit}.`
  }

  return null
}
