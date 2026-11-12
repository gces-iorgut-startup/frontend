import { create } from 'zustand'
import { AppointmentsService } from '../services/appointments.service'
import type { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '../types'

function todayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface AgendaState {
  selectedDate: string
  appointments: Appointment[]
  isLoading: boolean
  error: string | null

  setDate: (date: string) => void
  fetchAppointments: (date?: string) => Promise<void>
  createAppointment: (data: CreateAppointmentRequest) => Promise<void>
  cancelAppointment: (id: string, reason: string) => Promise<void>
  rescheduleAppointment: (id: string, dateTime: string, endDateTime: string) => Promise<void>
  updateAppointment: (id: string, data: UpdateAppointmentRequest) => Promise<void>
}

export const useAgendaStore = create<AgendaState>()((set, get) => ({
  selectedDate: todayISO(),
  appointments: [],
  isLoading: false,
  error: null,

  setDate: (date) => {
    set({ selectedDate: date })
    get().fetchAppointments(date)
  },

  fetchAppointments: async (date) => {
    const targetDate = date ?? get().selectedDate
    set({ isLoading: true, error: null })
    try {
      const appointments = await AppointmentsService.listByDay(targetDate)
      set({ appointments, isLoading: false })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao carregar agendamentos.'
      set({ error: message, isLoading: false })
    }
  },

  createAppointment: async (data) => {
    set({ isLoading: true, error: null })
    try {
      await AppointmentsService.create(data)
      await get().fetchAppointments()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao criar agendamento.'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  cancelAppointment: async (id, reason) => {
    set({ isLoading: true, error: null })
    try {
      await AppointmentsService.cancel(id, reason)
      await get().fetchAppointments()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao cancelar agendamento.'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  rescheduleAppointment: async (id, dateTime, endDateTime) => {
    set({ isLoading: true, error: null })
    try {
      await AppointmentsService.reschedule(id, { dateTime, endDateTime })
      await get().fetchAppointments()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao reagendar.'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  updateAppointment: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      await AppointmentsService.update(id, data)
      await get().fetchAppointments()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao editar atendimento.'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },
}))
