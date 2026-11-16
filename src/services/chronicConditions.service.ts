import { api } from './api'
import type {
  ChronicCondition,
  CreateChronicConditionRequest,
  UpdateChronicConditionRequest,
} from '../types'

export const ChronicConditionsService = {
  async listByPatient(patientId: string): Promise<ChronicCondition[]> {
    const response = await api.get<{ items: ChronicCondition[] }>(`/chronic-conditions/patient/${patientId}`)
    return response.data.items ?? []
  },

  async create(data: CreateChronicConditionRequest): Promise<ChronicCondition> {
    const response = await api.post<ChronicCondition>('/chronic-conditions', data)
    return response.data
  },

  async update(id: string, data: UpdateChronicConditionRequest): Promise<ChronicCondition> {
    const response = await api.patch<ChronicCondition>(`/chronic-conditions/${id}`, data)
    return response.data
  },
}
