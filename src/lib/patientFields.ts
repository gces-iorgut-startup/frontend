import type { PatientSex, PatientSpecies, ReproductiveCondition } from '../types'

export type { PatientSex, PatientSpecies, ReproductiveCondition } from '../types'

export const PATIENT_SPECIES_OPTIONS = [
  { value: 'CANINE', label: 'Canino' },
  { value: 'FELINE', label: 'Felino' },
  { value: 'BIRD', label: 'Ave' },
  { value: 'RODENT', label: 'Roedor' },
  { value: 'REPTILE', label: 'Réptil' },
] as const

export const PATIENT_SEX_OPTIONS = [
  { value: 'MALE', label: 'Macho' },
  { value: 'FEMALE', label: 'Fêmea' },
  { value: 'UNDETERMINED', label: 'Indeterminado' },
] as const

export const REPRODUCTIVE_CONDITION_OPTIONS = [
  { value: 'FERTILE', label: 'Fértil' },
  { value: 'NEUTERED', label: 'Castrado' },
] as const

const normalizeKey = (value: string) => value
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()

const LEGACY_SPECIES: Record<string, PatientSpecies> = {
  CANINE: 'CANINE',
  CANINO: 'CANINE',
  CACHORRO: 'CANINE',
  DOG: 'CANINE',
  FELINE: 'FELINE',
  FELINO: 'FELINE',
  GATO: 'FELINE',
  CAT: 'FELINE',
  BIRD: 'BIRD',
  AVE: 'BIRD',
  PASSARO: 'BIRD',
  RODENT: 'RODENT',
  ROEDOR: 'RODENT',
  REPTILE: 'REPTILE',
  REPTIL: 'REPTILE',
}

const LEGACY_SEX: Record<string, PatientSex> = {
  MALE: 'MALE',
  MACHO: 'MALE',
  MASCULINO: 'MALE',
  FEMALE: 'FEMALE',
  FEMEA: 'FEMALE',
  FEMININO: 'FEMALE',
  UNDETERMINED: 'UNDETERMINED',
  INDETERMINADO: 'UNDETERMINED',
}

const LEGACY_REPRODUCTIVE_CONDITION: Record<string, ReproductiveCondition> = {
  FERTILE: 'FERTILE',
  FERTIL: 'FERTILE',
  NEUTERED: 'NEUTERED',
  CASTRADO: 'NEUTERED',
  CASTRADA: 'NEUTERED',
}

export function normalizePatientSpecies(value?: string | null): PatientSpecies | '' {
  return value ? LEGACY_SPECIES[normalizeKey(value)] ?? '' : ''
}

export function normalizePatientSex(value?: string | null): PatientSex | '' {
  return value ? LEGACY_SEX[normalizeKey(value)] ?? '' : ''
}

export function normalizeReproductiveCondition(value?: string | null): ReproductiveCondition | '' {
  return value ? LEGACY_REPRODUCTIVE_CONDITION[normalizeKey(value)] ?? '' : ''
}

export function getPatientSpeciesLabel(value?: string | null): string {
  const normalized = normalizePatientSpecies(value)
  return PATIENT_SPECIES_OPTIONS.find((option) => option.value === normalized)?.label ?? value ?? '—'
}

export function getPatientSexLabel(value?: string | null): string {
  const normalized = normalizePatientSex(value)
  return PATIENT_SEX_OPTIONS.find((option) => option.value === normalized)?.label ?? value ?? '—'
}

export function getReproductiveConditionLabel(value?: string | null): string {
  const normalized = normalizeReproductiveCondition(value)
  return REPRODUCTIVE_CONDITION_OPTIONS.find((option) => option.value === normalized)?.label ?? value ?? '—'
}
