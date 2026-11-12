import { describe, it, expect } from 'vitest'
import {
  getCareFormValues,
  getClinicalRecordPayload,
  parseWeightKg,
} from '../clinicalRecordContent'
import type { ClinicalRecord } from '../../types'

function record(overrides: Partial<ClinicalRecord> = {}): ClinicalRecord {
  return {
    id: 'record-1',
    patientId: 'patient-1',
    vetId: 'vet-1',
    appointmentId: null,
    weightKg: null,
    clinicalNotes: null,
    diagnosis: null,
    pendingDiagnosis: null,
    prescriptions: null,
    breathingNotes: null,
    routineGuidance: null,
    aiSummary: null,
    finalized: false,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

const EMPTY_VALUES = {
  weightKg: '',
  clinicalNotes: '',
  breathingNotes: '',
  observations: '',
  examRequests: '',
  diagnosis: '',
  prescriptions: '',
  additionalObservations: '',
}

describe('parseWeightKg', () => {
  it('devolve null para valor vazio', () => {
    expect(parseWeightKg('')).toBeNull()
    expect(parseWeightKg('   ')).toBeNull()
  })

  it('devolve null para texto que não é número', () => {
    expect(parseWeightKg('doze quilos')).toBeNull()
  })

  it('devolve null para zero e negativo', () => {
    expect(parseWeightKg('0')).toBeNull()
    expect(parseWeightKg('-5')).toBeNull()
  })

  it('aceita ponto como separador decimal', () => {
    expect(parseWeightKg('12.5')).toBe(12.5)
  })

  it('aceita vírgula como separador decimal', () => {
    // O teclado numérico em pt-BR produz vírgula, e Number('12,5') é NaN.
    expect(parseWeightKg('12,5')).toBe(12.5)
  })

  it('ignora espaços nas pontas', () => {
    expect(parseWeightKg('  12,5  ')).toBe(12.5)
  })
})

describe('getCareFormValues — peso', () => {
  it('deixa o campo vazio quando o prontuário não tem peso', () => {
    expect(getCareFormValues(record()).weightKg).toBe('')
  })

  it('preenche o campo com o peso já registrado', () => {
    expect(getCareFormValues(record({ weightKg: 12.5 })).weightKg).toBe('12.5')
  })

  it('não confunde peso zero com ausência de peso', () => {
    expect(getCareFormValues(record({ weightKg: 0 })).weightKg).toBe('0')
  })
})

describe('getClinicalRecordPayload — peso', () => {
  it('inclui o peso no payload quando informado', () => {
    const payload = getClinicalRecordPayload({ ...EMPTY_VALUES, weightKg: '12,5' })

    expect(payload.weightKg).toBe(12.5)
  })

  it('omite a chave quando o peso está vazio', () => {
    // Mandar `undefined` num campo opcional faria o backend sobrescrever um
    // peso já registrado.
    const payload = getClinicalRecordPayload(EMPTY_VALUES)

    expect('weightKg' in payload).toBe(false)
  })

  it('omite a chave quando o peso é inválido', () => {
    const payload = getClinicalRecordPayload({ ...EMPTY_VALUES, weightKg: 'abc' })

    expect('weightKg' in payload).toBe(false)
  })

  it('continua enviando os demais campos do prontuário', () => {
    const payload = getClinicalRecordPayload({
      ...EMPTY_VALUES,
      weightKg: '12,5',
      clinicalNotes: '  tosse seca  ',
      diagnosis: 'traqueobronquite',
    })

    expect(payload.clinicalNotes).toBe('tosse seca')
    expect(payload.diagnosis).toBe('traqueobronquite')
    expect(payload.routineGuidance).toContain('__IOUGURT_META__:')
  })
})
