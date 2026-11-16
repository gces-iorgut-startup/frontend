import type { ClinicalRecord, UpdateClinicalRecordRequest } from '../types'

/**
 * Formato antigo das observações do atendimento.
 *
 * Antes do CLI-01 não havia campo próprio: as observações eram serializadas
 * em JSON com este prefixo e salvas dentro de `routineGuidance`, que existe
 * para guardar orientações ao tutor. O backend agora tem a coluna
 * `observations` e migrou os dados.
 *
 * Continuamos sabendo LER o formato velho — paramos só de escrevê-lo. Dois
 * motivos: a migração deixou de propósito as linhas com JSON corrompido como
 * estavam (para não perder o que o veterinário escreveu), e um cliente que
 * ainda não recarregou a página pode gravar no formato antigo.
 */
const LEGACY_META_PREFIX = '__IOUGURT_META__:'

export interface CareFormValues {
  weightKg: string
  clinicalNotes: string
  breathingNotes: string
  observations: string
  examRequests: string
  diagnosis: string
  prescriptions: string
  additionalObservations: string
}

export function parseRoutineGuidance(value?: string | null) {
  if (!value) {
    return {
      observations: '',
      additionalObservations: '',
    }
  }

  if (value.startsWith(LEGACY_META_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(LEGACY_META_PREFIX.length)) as {
        observations?: string
        additionalObservations?: string
      }

      return {
        observations: parsed.observations ?? '',
        additionalObservations: parsed.additionalObservations ?? '',
      }
    } catch {
      return {
        observations: '',
        additionalObservations: value,
      }
    }
  }

  return {
    observations: '',
    additionalObservations: value,
  }
}

/**
 * Lê as observações do atendimento de onde elas estiverem.
 *
 * O campo próprio ganha; o formato legado dentro de `routineGuidance` serve
 * de fallback. Sem esse fallback, todo atendimento gravado antes da migração
 * do CLI-01 abriria com o campo "Observações" vazio.
 */
export function resolveRecordObservations(record: {
  observations?: string | null
  routineGuidance?: string | null
}) {
  const legacy = parseRoutineGuidance(record.routineGuidance)
  const own = record.observations?.trim() ?? ''

  return {
    observations: own || legacy.observations,
    additionalObservations: legacy.additionalObservations,
  }
}

export function getCareFormValues(record: ClinicalRecord): CareFormValues {
  const { observations, additionalObservations } = resolveRecordObservations(record)

  return {
    weightKg: record.weightKg == null ? '' : String(record.weightKg),
    clinicalNotes: record.clinicalNotes ?? '',
    breathingNotes: record.breathingNotes ?? '',
    observations,
    examRequests: record.pendingDiagnosis ?? '',
    diagnosis: record.diagnosis ?? '',
    prescriptions: record.prescriptions ?? '',
    additionalObservations,
  }
}

/**
 * Converte o peso digitado no número que o backend espera.
 *
 * Aceita vírgula além de ponto: o teclado numérico em pt-BR produz "12,5" e
 * `Number('12,5')` é NaN. Devolve `null` quando não dá para aproveitar o
 * valor, para o payload simplesmente omitir o campo.
 */
export function parseWeightKg(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null

  return parsed
}

export function getClinicalRecordPayload(values: CareFormValues): UpdateClinicalRecordRequest {
  const weightKg = parseWeightKg(values.weightKg)

  return {
    // Omitimos a chave quando o peso não é aproveitável: mandar `undefined`
    // num campo opcional faria o backend sobrescrever um peso já registrado.
    ...(weightKg === null ? {} : { weightKg }),
    clinicalNotes: values.clinicalNotes.trim(),
    breathingNotes: values.breathingNotes.trim(),
    pendingDiagnosis: values.examRequests.trim(),
    diagnosis: values.diagnosis.trim(),
    prescriptions: values.prescriptions.trim(),
    // Cada um no seu campo: observações do atendimento em `observations` e
    // orientações ao tutor em `routineGuidance`, texto puro. Nada de JSON.
    observations: values.observations.trim(),
    routineGuidance: values.additionalObservations.trim(),
  }
}
