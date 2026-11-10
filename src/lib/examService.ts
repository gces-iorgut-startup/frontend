import { api } from './api'
import type { ExamFile } from '../types'

export const examService = {
  async listPatientExams(patientId: string, clinicalType?: string): Promise<ExamFile[]> {
    const params = clinicalType ? { clinicalType } : undefined
    const response = await api.get<{ items?: ExamFile[]; exams?: ExamFile[] }>(`/exams/patient/${patientId}`, {
      params,
    })
    // Backward/forward compatibility while backend contract stabilizes.
    return response.data.items || response.data.exams || []
  },

  async uploadExamFile(
    patientId: string,
    file: File,
    clinicalRecordId?: string,
    clinicalType?: string
  ): Promise<ExamFile> {
    const formData = new FormData()
    formData.append('patientId', patientId)
    formData.append('file', file)
    
    if (clinicalRecordId) {
      formData.append('clinicalRecordId', clinicalRecordId)
    }

    if (clinicalType) {
      formData.append('clinicalType', clinicalType)
    }

    const response = await api.post<ExamFile>('/exams/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  },

  resolveExamFileUrl(fileUrl: string): string {
    if (!fileUrl) return ''
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    const normalizedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
    const baseUrl = api.defaults.baseURL ?? ''
    // External API (prod): build URL against the backend origin directly.
    // Same-origin proxy (local/docker): route through /api so nginx forwards to the backend.
    if (/^https?:\/\//i.test(baseUrl)) {
      return baseUrl.replace(/\/+$/, '') + normalizedPath
    }
    return `/api${normalizedPath}`
  },

  downloadExamFile(fileUrl: string, fileName: string): void {
    const url = this.resolveExamFileUrl(fileUrl)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
}
