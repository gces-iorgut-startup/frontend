import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadPhotoModal } from '../UploadPhotoModal'
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

const photo: PatientPhoto = {
  id: 'photo-1',
  patientId: 'patient-1',
  photoUrl: '/uploads/foto.png',
  description: null,
  takenAt: '2026-01-15T10:00:00.000Z',
  createdAt: '2026-01-15T10:00:00.000Z',
}

function imageFile(name = 'foto.png', type = 'image/png') {
  return new File(['conteudo-binario'], name, { type })
}

describe('UploadPhotoModal — envio de foto (CLI-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mantém o botão de envio desabilitado sem arquivo', () => {
    render(<UploadPhotoModal patientId="patient-1" onClose={vi.fn()} onSuccess={vi.fn()} />)

    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeDisabled()
  })

  it('rejeita arquivo que não é imagem', async () => {
    render(<UploadPhotoModal patientId="patient-1" onClose={vi.fn()} onSuccess={vi.fn()} />)

    const input = screen.getByLabelText('Arquivo da foto') as HTMLInputElement
    const pdf = new File(['%PDF'], 'exame.pdf', { type: 'application/pdf' })

    // Usamos fireEvent em vez de user.upload de propósito: o userEvent respeita
    // o `accept` do input e descartaria o PDF antes de disparar o change. No
    // navegador o `accept` é só uma dica — o usuário pode escolher "todos os
    // arquivos" — então a validação do componente precisa valer de verdade.
    Object.defineProperty(input, 'files', { value: [pdf], configurable: true })
    fireEvent.change(input)

    expect(screen.getByText('Envie uma imagem (JPG, PNG ou WEBP).')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeDisabled()
  })

  it('rejeita imagem acima de 10MB', async () => {
    render(<UploadPhotoModal patientId="patient-1" onClose={vi.fn()} onSuccess={vi.fn()} />)

    const input = screen.getByLabelText('Arquivo da foto') as HTMLInputElement
    const huge = imageFile()
    Object.defineProperty(huge, 'size', { value: 11 * 1024 * 1024 })
    Object.defineProperty(input, 'files', { value: [huge], configurable: true })
    fireEvent.change(input)

    expect(screen.getByText('A imagem excede o limite de 10MB.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeDisabled()
  })

  it('envia a foto com descrição e chama onSuccess', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    mockedService.uploadPatientPhoto.mockResolvedValue(photo)

    render(<UploadPhotoModal patientId="patient-1" onClose={vi.fn()} onSuccess={onSuccess} />)

    await user.upload(screen.getByLabelText('Arquivo da foto'), imageFile())
    await user.type(screen.getByLabelText(/descrição/i), 'lesão na pata')
    await user.click(screen.getByRole('button', { name: /adicionar foto/i }))

    await waitFor(() => {
      expect(mockedService.uploadPatientPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          description: 'lesão na pata',
          takenAt: undefined,
        })
      )
    })
    expect(onSuccess).toHaveBeenCalledWith(photo)
  })

  it('mostra erro da API e não chama onSuccess', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    // Erro sem mensagem própria: cai no fallback amigável do getErrorMessage.
    mockedService.uploadPatientPhoto.mockRejectedValue(new Error())

    render(<UploadPhotoModal patientId="patient-1" onClose={vi.fn()} onSuccess={onSuccess} />)

    await user.upload(screen.getByLabelText('Arquivo da foto'), imageFile())
    await user.click(screen.getByRole('button', { name: /adicionar foto/i }))

    expect(await screen.findByText('Não foi possível enviar a foto.')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('permite remover a imagem selecionada', async () => {
    const user = userEvent.setup()
    render(<UploadPhotoModal patientId="patient-1" onClose={vi.fn()} onSuccess={vi.fn()} />)

    await user.upload(screen.getByLabelText('Arquivo da foto'), imageFile())
    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeEnabled()

    await user.click(screen.getByLabelText('Remover imagem selecionada'))

    expect(screen.getByRole('button', { name: /adicionar foto/i })).toBeDisabled()
  })

  it('fecha pelo botão cancelar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<UploadPhotoModal patientId="patient-1" onClose={onClose} onSuccess={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalled()
  })
})
