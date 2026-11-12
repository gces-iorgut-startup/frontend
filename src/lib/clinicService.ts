import { api } from './api'
import type { Clinic, UpdateClinicRequest } from '../types'

export const clinicService = {
  async getMyClinic(): Promise<Clinic> {
    const response = await api.get<{ clinic: Clinic }>('/clinics/me')
    return response.data.clinic
  },

  async getClinicByCode(code: string): Promise<Clinic> {
    const response = await api.get<{ clinic: Clinic }>(`/clinics/code/${encodeURIComponent(code)}`)
    return response.data.clinic
  },

  async updateMyClinic(data: UpdateClinicRequest): Promise<Clinic> {
    const response = await api.patch<{ clinic: Clinic }>('/clinics/me', data)
    return response.data.clinic
  },
}
