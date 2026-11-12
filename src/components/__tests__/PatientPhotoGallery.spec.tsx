import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientPhotoGallery } from '../PatientPhotoGallery'
import { photoService } from '../../lib/photoService'
import type { PatientPhoto } from '../../types'

vi.mock('../../lib/photoService', () => ({
  photoService: {
    listPatientPhotos: vi.fn(),
    uploadPatientPhoto: vi.fn(),
    resolvePhotoUrl: vi.fn((url: string) => `/api${url}`),
  },
}))

const mockedService = vi.mocked(photoService)

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

describe('PatientPhotoGallery — Acompanhamento fotográfico (CLI-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedService.resolvePhotoUrl.mockImplementation((url: string) => `/api${url}`)
  })

  it('busca as fotos do paciente ao montar', async () => {
    mockedService.listPatientPhotos.mockResolvedValue([photoFixture()])

    render(<PatientPhotoGallery patientId="patient-1" />)

    await waitFor(() => {
      expect(mockedService.listPatientPhotos).toHaveBeenCalledWith('patient-1')
    })
  })

  it('mostra a foto com data e descrição', async () => {
    mockedService.listPatientPhotos.mockResolvedValue([photoFixture()])

    render(<PatientPhotoGallery patientId="patient-1" />)

    expect(await screen.findByText('Lesão na pata direita')).toBeInTheDocument()
    expect(screen.getByText('15/01/2026')).toBeInTheDocument()

    const image = screen.getByAltText('Lesão na pata direita') as HTMLImageElement
    expect(image.getAttribute('src')).toBe('/api/uploads/foto.png')
  })

  it('usa um alt descritivo quando a foto não tem descrição', async () => {
    mockedService.listPatientPhotos.mockResolvedValue([
      photoFixture({ description: null }),
    ])

    render(<PatientPhotoGallery patientId="patient-1" />)

    expect(
      await screen.findByAltText('Foto do paciente de 15/01/2026')
    ).toBeInTheDocument()
  })

  it('mostra estado vazio quando o paciente não tem fotos', async () => {
    mockedService.listPatientPhotos.mockResolvedValue([])

    render(<PatientPhotoGallery patientId="patient-1" />)

    expect(
      await screen.findByText('Nenhuma foto registrada para este paciente.')
    ).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando a listagem falha', async () => {
    // Erro sem mensagem própria: cai no fallback amigável do getErrorMessage.
    mockedService.listPatientPhotos.mockRejectedValue(new Error())

    render(<PatientPhotoGallery patientId="patient-1" />)

    expect(
      await screen.findByText('Não foi possível carregar as fotos do paciente.')
    ).toBeInTheDocument()
  })

  it('ordena as fotos da mais antiga para a mais recente', async () => {
    mockedService.listPatientPhotos.mockResolvedValue([
      photoFixture({ id: 'a', description: 'antiga', takenAt: '2026-01-01T10:00:00.000Z' }),
      photoFixture({ id: 'b', description: 'recente', takenAt: '2026-03-01T10:00:00.000Z' }),
    ])

    render(<PatientPhotoGallery patientId="patient-1" />)

    await screen.findByText('antiga')
    const descriptions = screen.getAllByText(/antiga|recente/).map((el) => el.textContent)
    expect(descriptions).toEqual(['antiga', 'recente'])
  })

  it('amplia a foto ao clicar e fecha pelo botão', async () => {
    const user = userEvent.setup()
    mockedService.listPatientPhotos.mockResolvedValue([photoFixture()])

    render(<PatientPhotoGallery patientId="patient-1" />)

    await user.click(await screen.findByAltText('Lesão na pata direita'))

    expect(screen.getByLabelText('Fechar foto ampliada')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Fechar foto ampliada'))

    await waitFor(() => {
      expect(screen.queryByLabelText('Fechar foto ampliada')).not.toBeInTheDocument()
    })
  })

  it('abre o modal de upload pelo botão de adicionar', async () => {
    const user = userEvent.setup()
    mockedService.listPatientPhotos.mockResolvedValue([])

    render(<PatientPhotoGallery patientId="patient-1" />)

    await screen.findByText('Nenhuma foto registrada para este paciente.')
    await user.click(screen.getByRole('button', { name: /adicionar foto/i }))

    expect(screen.getByText('Adicionar foto', { selector: 'h3' })).toBeInTheDocument()
  })
})
