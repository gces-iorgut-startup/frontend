import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { photoService } from '../photoService'
import { api } from '../api'
import type { PatientPhoto } from '../../types'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: '/api' },
  },
}))

// `vi.mocked(api)` não faz deep-mock: os métodos continuam com a assinatura
// sobrecarregada do axios, sem os helpers de mock. Daí o cast explícito.
const mockedApi = {
  get: api.get as unknown as Mock,
  post: api.post as unknown as Mock,
}

function photoFixture(overrides: Partial<PatientPhoto> = {}): PatientPhoto {
  return {
    id: 'photo-1',
    patientId: 'patient-1',
    photoUrl: '/uploads/foto.png',
    description: 'Lesão na pata direita',
    takenAt: '2026-01-15T10:00:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('photoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listPatientPhotos', () => {
    it('devolve os itens da resposta', async () => {
      const photo = photoFixture()
      mockedApi.get.mockResolvedValue({ data: { items: [photo] } })

      const result = await photoService.listPatientPhotos('patient-1')

      expect(mockedApi.get).toHaveBeenCalledWith('/patient-photos/patient/patient-1')
      expect(result).toEqual([photo])
    })

    it('devolve lista vazia quando a resposta não traz items', async () => {
      mockedApi.get.mockResolvedValue({ data: {} })

      await expect(photoService.listPatientPhotos('patient-1')).resolves.toEqual([])
    })
  })

  describe('uploadPatientPhoto', () => {
    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' })

    it('envia patientId e arquivo como multipart', async () => {
      mockedApi.post.mockResolvedValue({ data: photoFixture() })

      await photoService.uploadPatientPhoto({ patientId: 'patient-1', file })

      const [url, formData, config] = mockedApi.post.mock.calls[0]
      expect(url).toBe('/patient-photos/upload')
      expect(config?.headers?.['Content-Type']).toBe('multipart/form-data')

      const body = formData as FormData
      expect(body.get('patientId')).toBe('patient-1')
      expect(body.get('file')).toBe(file)
    })

    it('omite descrição vazia ou só com espaços', async () => {
      mockedApi.post.mockResolvedValue({ data: photoFixture() })

      await photoService.uploadPatientPhoto({ patientId: 'patient-1', file, description: '   ' })

      const body = mockedApi.post.mock.calls[0][1] as FormData
      expect(body.has('description')).toBe(false)
    })

    it('envia descrição sem espaços nas pontas', async () => {
      mockedApi.post.mockResolvedValue({ data: photoFixture() })

      await photoService.uploadPatientPhoto({
        patientId: 'patient-1',
        file,
        description: '  lesão na pata  ',
      })

      const body = mockedApi.post.mock.calls[0][1] as FormData
      expect(body.get('description')).toBe('lesão na pata')
    })

    it('omite takenAt quando não informado', async () => {
      mockedApi.post.mockResolvedValue({ data: photoFixture() })

      await photoService.uploadPatientPhoto({ patientId: 'patient-1', file })

      const body = mockedApi.post.mock.calls[0][1] as FormData
      expect(body.has('takenAt')).toBe(false)
    })

    it('envia takenAt quando informado', async () => {
      mockedApi.post.mockResolvedValue({ data: photoFixture() })

      await photoService.uploadPatientPhoto({
        patientId: 'patient-1',
        file,
        takenAt: '2026-01-15T10:00:00.000Z',
      })

      const body = mockedApi.post.mock.calls[0][1] as FormData
      expect(body.get('takenAt')).toBe('2026-01-15T10:00:00.000Z')
    })
  })

  describe('resolvePhotoUrl', () => {
    it('resolve caminho relativo pelo proxy', () => {
      expect(photoService.resolvePhotoUrl('/uploads/foto.png')).toBe('/api/uploads/foto.png')
    })
  })
})
