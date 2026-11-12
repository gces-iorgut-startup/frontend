import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadExamModal } from '../UploadExamModal'
import { examService } from '../../lib/examService'
import type { ExamFile } from '../../types'

vi.mock('../../lib/examService', () => ({
  examService: {
    uploadExamFile: vi.fn(),
  },
}))

describe('UploadExamModal', () => {
  const patientId = 'patient-123'
  const onClose = vi.fn()
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza os campos de arquivo e de seleção do tipo clínico', () => {
    render(<UploadExamModal patientId={patientId} onClose={onClose} onSuccess={onSuccess} />)

    expect(screen.getByRole('heading', { name: /Anexar Exame/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipo Clínico do Exame/i)).toBeInTheDocument()
    expect(screen.getByText(/Selecione o tipo clínico \(opcional\)/i)).toBeInTheDocument()
    expect(screen.getByText('Hemograma')).toBeInTheDocument()
    expect(screen.getByText('Bioquímico')).toBeInTheDocument()
    expect(screen.getByText('Raio-X')).toBeInTheDocument()
    expect(screen.getByText('Ultrassom')).toBeInTheDocument()
    expect(screen.getByText('Outro')).toBeInTheDocument()
  })

  it('permite selecionar o tipo clínico e envia ao submeter', async () => {
    const user = userEvent.setup()
    const mockExam: ExamFile = {
      id: 'exam-1',
      patientId,
      fileName: 'hemograma.pdf',
      fileUrl: '/uploads/hemograma.pdf',
      fileType: 'pdf',
      clinicalType: 'HEMOGRAMA',
      uploadedAt: new Date().toISOString(),
    }
    vi.mocked(examService.uploadExamFile).mockResolvedValue(mockExam)

    const { container } = render(
      <UploadExamModal patientId={patientId} onClose={onClose} onSuccess={onSuccess} />
    )

    // Select clinical type
    const select = screen.getByLabelText(/Tipo Clínico do Exame/i)
    await user.selectOptions(select, 'HEMOGRAMA')

    // Attach file
    const file = new File(['dummy content'], 'hemograma.pdf', { type: 'application/pdf' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    // Click submit
    const submitButton = screen.getByRole('button', { name: /Anexar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(examService.uploadExamFile).toHaveBeenCalledWith(
        patientId,
        file,
        undefined,
        'HEMOGRAMA'
      )
      expect(onSuccess).toHaveBeenCalledWith(mockExam)
    })
  })

  it('permite enviar sem selecionar tipo clínico (compatibilidade opcional)', async () => {
    const user = userEvent.setup()
    const mockExam: ExamFile = {
      id: 'exam-2',
      patientId,
      fileName: 'documento.pdf',
      fileUrl: '/uploads/documento.pdf',
      fileType: 'pdf',
      clinicalType: null,
      uploadedAt: new Date().toISOString(),
    }
    vi.mocked(examService.uploadExamFile).mockResolvedValue(mockExam)

    const { container } = render(
      <UploadExamModal patientId={patientId} onClose={onClose} onSuccess={onSuccess} />
    )

    // Attach file without selecting clinical type
    const file = new File(['dummy content'], 'documento.pdf', { type: 'application/pdf' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    const submitButton = screen.getByRole('button', { name: /Anexar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(examService.uploadExamFile).toHaveBeenCalledWith(
        patientId,
        file,
        undefined,
        undefined
      )
      expect(onSuccess).toHaveBeenCalledWith(mockExam)
    })
  })
})
