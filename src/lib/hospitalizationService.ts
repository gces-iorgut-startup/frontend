import { api } from './api'
import type {
  AddHospitalizationEvolutionRequest,
  AdmitPatientRequest,
  Hospitalization,
  HospitalizationDetails,
  HospitalizationEvolution,
  OpenHospitalizationStatus,
} from '../types'

/**
 * As rotas de internação carregam a clínica no caminho, diferente do resto da
 * API. O backend ainda confere esse id contra o token e responde 403 se
 * divergir, então o valor aqui só precisa ser o da sessão — não é ele que
 * autoriza nada.
 */
function basePath(clinicId: string): string {
  return `/clinics/${clinicId}/hospitalizations`
}

/** Remove campos vazios para o Zod do backend não receber `undefined` explícito. */
function buildEvolutionPayload(
  input: AddHospitalizationEvolutionRequest
): AddHospitalizationEvolutionRequest {
  const payload: AddHospitalizationEvolutionRequest = { notes: input.notes.trim() }

  if (input.temperature !== undefined) payload.temperature = input.temperature
  if (input.heartRate !== undefined) payload.heartRate = input.heartRate
  if (input.respiratoryRate !== undefined) payload.respiratoryRate = input.respiratoryRate

  const mucous = input.mucousMembranes?.trim()
  if (mucous) payload.mucousMembranes = mucous

  return payload
}

export const hospitalizationService = {
  async listActive(clinicId: string): Promise<Hospitalization[]> {
    const response = await api.get<{ items?: Hospitalization[] }>(
      `${basePath(clinicId)}/active`
    )
    return response.data.items ?? []
  },

  async getDetails(clinicId: string, hospitalizationId: string): Promise<HospitalizationDetails> {
    const response = await api.get<HospitalizationDetails>(
      `${basePath(clinicId)}/${hospitalizationId}`
    )
    return response.data
  },

  async admitPatient(clinicId: string, input: AdmitPatientRequest): Promise<Hospitalization> {
    const response = await api.post<Hospitalization>(basePath(clinicId), {
      patientId: input.patientId,
      bedIdentifier: input.bedIdentifier.trim(),
      reason: input.reason.trim(),
      // Chave omitida quando não informado: o backend assume ADMITTED.
      ...(input.status ? { status: input.status } : {}),
    })
    return response.data
  },

  async updateStatus(
    clinicId: string,
    hospitalizationId: string,
    status: OpenHospitalizationStatus
  ): Promise<Hospitalization> {
    const response = await api.patch<Hospitalization>(
      `${basePath(clinicId)}/${hospitalizationId}/status`,
      { status }
    )
    return response.data
  },

  async addEvolution(
    clinicId: string,
    hospitalizationId: string,
    input: AddHospitalizationEvolutionRequest
  ): Promise<HospitalizationEvolution> {
    const response = await api.post<HospitalizationEvolution>(
      `${basePath(clinicId)}/${hospitalizationId}/evolutions`,
      buildEvolutionPayload(input)
    )
    return response.data
  },

  async discharge(
    clinicId: string,
    hospitalizationId: string,
    dischargeNotes?: string
  ): Promise<Hospitalization> {
    const notes = dischargeNotes?.trim()
    const response = await api.patch<Hospitalization>(
      `${basePath(clinicId)}/${hospitalizationId}/discharge`,
      notes ? { dischargeNotes: notes } : {}
    )
    return response.data
  },
}
