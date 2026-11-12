import { api } from './api'
import type { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '../types'

interface RescheduleAppointmentRequest {
  dateTime: string
  endDateTime: string
}

export const AppointmentsService = {
  async listByDay(date: string, vetId?: string): Promise<Appointment[]> {
    const response = await api.get<{ appointments: Appointment[] }>('/appointments', {
      params: { date, vetId },
    })
    return response.data.appointments
  },

  async listInProgress(): Promise<Appointment[]> {
    const response = await api.get<{ appointments: Appointment[] }>('/appointments', {
      params: { status: 'IN_PROGRESS' },
    })
    return response.data.appointments
  },

  async create(data: CreateAppointmentRequest): Promise<Appointment> {
    const response = await api.post<{ appointment: Appointment }>('/appointments', data)
    return response.data.appointment
  },

  async cancel(id: string, reason: string): Promise<Appointment> {
    const response = await api.delete<Appointment>(`/appointments/${id}`, {
      data: { reason },
    })
    return response.data
  },

  async reschedule(id: string, data: RescheduleAppointmentRequest): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/appointments/${id}/reschedule`, data)
    return response.data
  },

  async update(id: string, data: UpdateAppointmentRequest): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/appointments/${id}`, data)
    return response.data
  },
}
