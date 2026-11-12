import { api } from './api'
import type {
  AdminMetrics,
  AdminAppointmentsTrendResponse,
  RecentActivities,
} from '../types'

export const DashboardService = {
  async getAdminMetrics(): Promise<AdminMetrics> {
    const response = await api.get<AdminMetrics>('/dashboard/admin')
    return response.data
  },

  async getAdminAppointmentsTrend(days = 30): Promise<AdminAppointmentsTrendResponse> {
    const response = await api.get<AdminAppointmentsTrendResponse>('/dashboard/admin/appointments-trend', {
      params: { days },
    })

    return response.data
  },

  async getRecentActivities(limit = 5): Promise<RecentActivities> {
    const response = await api.get<RecentActivities>('/dashboard/recent-activities', {
      params: { limit },
    })

    return response.data
  },
}
