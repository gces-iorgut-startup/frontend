import type { AppointmentCategory } from '../types'

export const APPOINTMENT_CATEGORY_LABELS: Record<AppointmentCategory, string> = {
  GENERAL: 'Consulta geral',
  RETURN: 'Retorno',
  SURGICAL_EVALUATION: 'Avaliação cirúrgica',
  VACCINATION: 'Vacinação',
  OBSERVATION: 'Consulta',
  EXAM: 'Exame',
  SURGICAL: 'Cirurgia',
}

export const HOME_AGENDA_CATEGORY_COLOR_CLASS: Record<AppointmentCategory, string> = {
  GENERAL: 'category-yellow',
  RETURN: 'category-cyan',
  SURGICAL_EVALUATION: 'category-pink',
  VACCINATION: 'category-cyan',
  OBSERVATION: 'category-yellow',
  EXAM: 'category-pink',
  SURGICAL: 'category-cyan',
}

export const APPOINTMENT_CATEGORY_OPTIONS = (
  Object.entries(APPOINTMENT_CATEGORY_LABELS) as [AppointmentCategory, string][]
).map(([value, label]) => ({ value, label }))

export function getAppointmentCategoryLabel(category?: string | null): string {
  if (!category) return 'Atendimento'
  return APPOINTMENT_CATEGORY_LABELS[category as AppointmentCategory] ?? category
}
