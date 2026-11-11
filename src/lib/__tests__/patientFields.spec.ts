import { describe, expect, it } from 'vitest'
import {
  getPatientSexLabel,
  getPatientSpeciesLabel,
  getReproductiveConditionLabel,
  normalizePatientSex,
  normalizePatientSpecies,
  normalizeReproductiveCondition,
} from '../patientFields'

describe('patientFields', () => {
  it('traduz os códigos da API para português', () => {
    expect(getPatientSpeciesLabel('CANINE')).toBe('Canino')
    expect(getPatientSpeciesLabel('BIRD')).toBe('Ave')
    expect(getPatientSexLabel('UNDETERMINED')).toBe('Indeterminado')
    expect(getReproductiveConditionLabel('NEUTERED')).toBe('Castrado')
  })

  it('normaliza valores legados ao editar pacientes antigos', () => {
    expect(normalizePatientSpecies('Cachorro')).toBe('CANINE')
    expect(normalizePatientSpecies('Pássaro')).toBe('BIRD')
    expect(normalizePatientSex('Feminino')).toBe('FEMALE')
    expect(normalizeReproductiveCondition('Fértil')).toBe('FERTILE')
  })

  it('mantém um valor legado desconhecido na exibição e impede seu reenvio', () => {
    expect(getPatientSpeciesLabel('Outro')).toBe('Outro')
    expect(normalizePatientSpecies('Outro')).toBe('')
  })
})
