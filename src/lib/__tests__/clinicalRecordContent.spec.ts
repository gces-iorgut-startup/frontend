import { describe, it, expect } from 'vitest'
import {
  getCareFormValues,
  getClinicalRecordPayload,
  parseWeightKg,
  resolveRecordObservations,
} from '../clinicalRecordContent'
import type { ClinicalRecord } from '../../types'

const LEGACY_PREFIX = '__IOUGURT_META__:'

/** Monta um `routineGuidance` no formato improvisado que o CLI-01 aposentou. */
function legacyGuidance(observations: string, additionalObservations: string) {
  return LEGACY_PREFIX + JSON.stringify({ observations, additionalObservations })
}

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
    observations: null,
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
  })
})

describe('resolveRecordObservations', () => {
  it('lê o campo próprio', () => {
    const resolved = resolveRecordObservations(
      record({ observations: 'Tosse noturna', routineGuidance: 'Retorno em 15 dias' })
    )

    expect(resolved).toEqual({
      observations: 'Tosse noturna',
      additionalObservations: 'Retorno em 15 dias',
    })
  })

  it('lê o formato legado quando o campo próprio está vazio', () => {
    // Este é o caso que a migração do backend deixou para trás: linhas com
    // JSON corrompido não foram migradas de propósito.
    const resolved = resolveRecordObservations(
      record({ routineGuidance: legacyGuidance('Tosse noturna', 'Retorno em 15 dias') })
    )

    expect(resolved).toEqual({
      observations: 'Tosse noturna',
      additionalObservations: 'Retorno em 15 dias',
    })
  })

  it('prefere o campo próprio quando os dois existem', () => {
    const resolved = resolveRecordObservations(
      record({
        observations: 'Valor novo',
        routineGuidance: legacyGuidance('Valor legado', 'Retorno em 15 dias'),
      })
    )

    expect(resolved.observations).toBe('Valor novo')
  })

  it('ignora campo próprio só com espaços', () => {
    const resolved = resolveRecordObservations(
      record({ observations: '   ', routineGuidance: legacyGuidance('Valor legado', '') })
    )

    expect(resolved.observations).toBe('Valor legado')
  })

  it('devolve vazio quando não há nada gravado', () => {
    expect(resolveRecordObservations(record())).toEqual({
      observations: '',
      additionalObservations: '',
    })
  })

  it('não trata texto puro como observação do atendimento', () => {
    // Orientação ao tutor gravada sem prefixo nenhum pertence ao campo de
    // observações adicionais, não ao de observações do atendimento.
    const resolved = resolveRecordObservations(record({ routineGuidance: 'Retorno em 15 dias' }))

    expect(resolved).toEqual({
      observations: '',
      additionalObservations: 'Retorno em 15 dias',
    })
  })
})

describe('getCareFormValues — observações (CLI-01)', () => {
  it('preenche o campo a partir da coluna própria', () => {
    const values = getCareFormValues(record({ observations: 'Tosse noturna' }))

    expect(values.observations).toBe('Tosse noturna')
  })

  it('não deixa o campo vazio para atendimento já migrado', () => {
    // Regressão real: a migração do backend tirou o texto de dentro de
    // routineGuidance, e o frontend lia só de lá. O campo abria vazio e
    // parecia que a observação do veterinário havia sido perdida.
    const values = getCareFormValues(
      record({ observations: 'Tosse noturna', routineGuidance: 'Retorno em 15 dias' })
    )

    expect(values.observations).toBe('Tosse noturna')
    expect(values.additionalObservations).toBe('Retorno em 15 dias')
  })

  it('continua abrindo atendimento no formato antigo', () => {
    const values = getCareFormValues(
      record({ routineGuidance: legacyGuidance('Tosse noturna', 'Retorno em 15 dias') })
    )

    expect(values.observations).toBe('Tosse noturna')
    expect(values.additionalObservations).toBe('Retorno em 15 dias')
  })
})

describe('getClinicalRecordPayload — observações (CLI-01)', () => {
  it('manda cada observação no seu campo', () => {
    const payload = getClinicalRecordPayload({
      ...EMPTY_VALUES,
      observations: '  Tosse noturna  ',
      additionalObservations: '  Retorno em 15 dias  ',
    })

    expect(payload.observations).toBe('Tosse noturna')
    expect(payload.routineGuidance).toBe('Retorno em 15 dias')
  })

  it('não escreve mais JSON nem prefixo em routineGuidance', () => {
    const payload = getClinicalRecordPayload({
      ...EMPTY_VALUES,
      observations: 'Tosse noturna',
      additionalObservations: 'Retorno em 15 dias',
    })

    expect(payload.routineGuidance).not.toContain(LEGACY_PREFIX)
    expect(payload.routineGuidance).not.toContain('{')
  })

  it('sobrevive a ida e volta sem embaralhar os campos', () => {
    const payload = getClinicalRecordPayload({
      ...EMPTY_VALUES,
      observations: 'Tosse noturna',
      additionalObservations: 'Retorno em 15 dias',
    })

    const values = getCareFormValues(
      record({
        observations: payload.observations ?? null,
        routineGuidance: payload.routineGuidance ?? null,
      })
    )

    expect(values.observations).toBe('Tosse noturna')
    expect(values.additionalObservations).toBe('Retorno em 15 dias')
  })
})
