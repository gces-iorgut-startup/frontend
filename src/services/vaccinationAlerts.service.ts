import { api } from '../lib/api'
import type { VaccinationAlertsResponse, VaccinationAlertStatus } from '../types'

export interface ListVaccinationAlertsFilters {
  status?: VaccinationAlertStatus
  days?: number
}

export const VaccinationAlertsService = {
  async listByClinic(
    clinicId: string,
    filters?: ListVaccinationAlertsFilters
  ): Promise<VaccinationAlertsResponse> {
    const params = new URLSearchParams()
    if (filters?.status) {
      params.set('status', filters.status)
    }
    if (filters?.days != null) {
      params.set('days', String(filters.days))
    }
    const query = params.toString() ? `?${params.toString()}` : ''

    const response = await api.get<VaccinationAlertsResponse>(
      `/clinics/${clinicId}/vaccinations/alerts${query}`
    )
    return response.data
  },
}
