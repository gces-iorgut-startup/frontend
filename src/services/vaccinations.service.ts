import { api } from './api'
import type { Vaccination, CreateVaccinationRequest, VaccinationStatus } from '../types'

export const VaccinationsService = {
  async listByPatient(patientId: string): Promise<Vaccination[]> {
    const response = await api.get<{ items: Vaccination[] }>(`/vaccinations/patient/${patientId}`)
    return response.data.items ?? []
  },

  async create(data: CreateVaccinationRequest): Promise<Vaccination> {
    const response = await api.post<Vaccination>('/vaccinations', data)
    return response.data
  },

  async updateStatus(id: string, status: VaccinationStatus): Promise<Vaccination> {
    const response = await api.patch<Vaccination>(`/vaccinations/${id}/status`, { status })
    return response.data
  },
}
