import { api } from './api'
import { resolveUploadUrl } from './uploadUrl'
import type { PatientPhoto } from '../types'

export interface UploadPatientPhotoInput {
  patientId: string
  file: File
  description?: string
  takenAt?: string
}

export const photoService = {
  async listPatientPhotos(patientId: string): Promise<PatientPhoto[]> {
    const response = await api.get<{ items?: PatientPhoto[] }>(
      `/patient-photos/patient/${patientId}`
    )
    return response.data.items ?? []
  },

  async uploadPatientPhoto({
    patientId,
    file,
    description,
    takenAt,
  }: UploadPatientPhotoInput): Promise<PatientPhoto> {
    const formData = new FormData()
    formData.append('patientId', patientId)
    formData.append('file', file)

    if (description?.trim()) {
      formData.append('description', description.trim())
    }

    if (takenAt) {
      formData.append('takenAt', takenAt)
    }

    const response = await api.post<PatientPhoto>('/patient-photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data
  },

  resolvePhotoUrl(photoUrl: string): string {
    return resolveUploadUrl(photoUrl)
  },
}
