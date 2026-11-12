import { describe, expect, it } from 'vitest'
import {
  APPOINTMENT_CATEGORY_LABELS,
  APPOINTMENT_CATEGORY_OPTIONS,
  getAppointmentCategoryLabel,
} from '../appointmentCategory'

describe('appointmentCategory', () => {
  it('expoe os novos tipos com rotulos amigaveis', () => {
    expect(APPOINTMENT_CATEGORY_LABELS).toMatchObject({
      GENERAL: 'Consulta geral',
      RETURN: 'Retorno',
      SURGICAL_EVALUATION: 'Avaliação cirúrgica',
    })
    expect(APPOINTMENT_CATEGORY_OPTIONS.map(option => option.value)).toEqual(expect.arrayContaining([
      'GENERAL', 'RETURN', 'SURGICAL_EVALUATION',
    ]))
  })

  it('retorna o rotulo compartilhado do tipo', () => {
    expect(getAppointmentCategoryLabel('RETURN')).toBe('Retorno')
  })
})
