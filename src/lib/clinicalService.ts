import { api } from './api'
import { toLocalDateString } from './localDate'
import { AppointmentsService } from '../services/appointments.service'
import type {
  Appointment,
  ClinicalHistoryItem,
  ClinicalRecord,
  Patient,
  UpdateClinicalRecordRequest,
  Vaccination,
} from '../types'

const inFlightClinicalRecordStarts = new Map<string, Promise<ClinicalRecord>>()

function getLocalIsoDate(value?: string | null) {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  // Dia local, o mesmo critério da listagem de agenda (tzOffset).
  return toLocalDateString(parsed)
}

async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  return AppointmentsService.listByDay(date)
}

async function enrichHistoryWithVetNames(items: ClinicalHistoryItem[]) {
  const dates = Array.from(
    new Set(
      items
        .map((item) => getLocalIsoDate(item.appointment?.dateTime ?? item.createdAt))
        .filter((value): value is string => Boolean(value)),
    ),
  )

  if (dates.length === 0) return items

  const appointmentBatches = await Promise.all(dates.map((date) => getAppointmentsByDate(date)))
  const appointmentsById = new Map(
    appointmentBatches
      .flat()
      .map((appointment) => [appointment.id, appointment] as const),
  )

  return items.map((item) => {
    const linkedAppointment = item.appointmentId
      ? appointmentsById.get(item.appointmentId)
      : undefined

    if (!linkedAppointment) return item

    return {
      ...item,
      vet: item.vet ?? linkedAppointment.vet,
      appointment: {
        id: item.appointment?.id ?? linkedAppointment.id,
        category: item.appointment?.category ?? linkedAppointment.category,
        dateTime: item.appointment?.dateTime ?? linkedAppointment.dateTime,
        vet: item.appointment?.vet ?? linkedAppointment.vet,
      },
    }
  })
}

export const clinicalService = {
  async startClinicalRecord(appointmentId: string): Promise<ClinicalRecord> {
    const existingRequest = inFlightClinicalRecordStarts.get(appointmentId)
    if (existingRequest) return existingRequest

    // Deduplicate concurrent starts for the same appointment.
    // This avoids creating the same clinical record twice in React StrictMode/dev remounts.
    const request = api
      .post<ClinicalRecord>('/clinical-records', { appointmentId })
      .then((response) => response.data)
      .finally(() => {
        inFlightClinicalRecordStarts.delete(appointmentId)
      })

    inFlightClinicalRecordStarts.set(appointmentId, request)
    return request
  },

  async updateClinicalRecord(
    recordId: string,
    data: UpdateClinicalRecordRequest,
  ): Promise<ClinicalRecord> {
    const response = await api.put<ClinicalRecord>(`/clinical-records/${recordId}`, data)
    return response.data
  },

  async finalizeClinicalRecord(recordId: string, endDateTime?: string): Promise<ClinicalRecord> {
    const response = await api.patch<ClinicalRecord>(`/clinical-records/${recordId}/finalize`, {
      ...(endDateTime ? { endDateTime } : {}),
    })
    return response.data
  },

  async getPatient(patientId: string): Promise<Patient> {
    const response = await api.get<{ patient: Patient } | Patient>(`/patients/${patientId}`)
    return 'patient' in response.data ? response.data.patient : response.data
  },

  async getPatientHistory(patientId: string): Promise<ClinicalHistoryItem[]> {
    const response = await api.get<{ items: ClinicalHistoryItem[] }>(
      `/clinical-records/patient/${patientId}`,
    )
    return enrichHistoryWithVetNames(response.data.items ?? [])
  },

  async getPatientVaccinations(patientId: string): Promise<Vaccination[]> {
    const response = await api.get<{ items: Vaccination[] }>(`/vaccinations/patient/${patientId}`)
    return response.data.items ?? []
  },

  async getPrescriptionPdf(recordId: string): Promise<Blob> {
    const response = await api.get(`/clinical-records/${recordId}/prescription`, {
      responseType: 'blob',
    })
    return response.data
  },
}
