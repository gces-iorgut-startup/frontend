import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PatientDetailsPage } from '../PatientDetailsPage'
import { api } from '../../../lib/api'
import { clinicalService } from '../../../lib/clinicalService'
import { examService } from '../../../lib/examService'
import type { ExamFile, Patient } from '../../../types'

vi.mock('../../../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('../../../lib/clinicalService', () => ({
  clinicalService: {
    getPatientHistory: vi.fn(),
  },
}))

vi.mock('../../../lib/examService', () => ({
  examService: {
    listPatientExams: vi.fn(),
    downloadExamFile: vi.fn(),
    uploadExamFile: vi.fn(),
  },
}))

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { role: string; clinicId: string } }) => unknown) =>
    selector({ user: { role: 'VET', clinicId: 'clinic-1' } }),
}))

const mockPatient: Patient = {
  id: 'patient-123',
  name: 'Rex',
  species: 'CANINE',
  breed: 'Labrador',
  sex: 'MALE',
  birthDate: '2020-01-01',
  weightKg: 25,
  microchip: null,
  observations: null,
  tutorId: 'tutor-1',
  createdAt: '2020-01-01',
  updatedAt: '2020-01-01',
  tutor: {
    id: 'tutor-1',
    fullName: 'Carlos Silva',
    cpf: '12345678901',
    phone: '11999999999',
    email: 'carlos@example.com',
    createdAt: '2020-01-01',
    updatedAt: '2020-01-01',
  },
}

const mockExams: ExamFile[] = [
  {
    id: 'exam-1',
    patientId: 'patient-123',
    fileName: 'hemograma_rex.pdf',
    fileUrl: '/uploads/hemograma_rex.pdf',
    fileType: 'pdf',
    clinicalType: 'HEMOGRAMA',
    uploadedAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'exam-2',
    patientId: 'patient-123',
    fileName: 'raio_x_pata.png',
    fileUrl: '/uploads/raio_x_pata.png',
    fileType: 'image',
    clinicalType: 'RAIO_X',
    uploadedAt: '2026-11-02T10:00:00Z',
  },
  {
    id: 'exam-3',
    patientId: 'patient-123',
    fileName: 'exame_antigo_sem_tipo.pdf',
    fileUrl: '/uploads/exame_antigo_sem_tipo.pdf',
    fileType: 'pdf',
    clinicalType: null, // Legacy exam
    uploadedAt: '2026-10-15T10:00:00Z',
  },
]

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={['/pacientes/patient-123']}>
      <Routes>
        <Route path="/pacientes/:id" element={<PatientDetailsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PatientDetailsPage — Aba Exames e Classificação Clínica', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: { patient: mockPatient } })
    vi.mocked(clinicalService.getPatientHistory).mockResolvedValue([])
    vi.mocked(examService.listPatientExams).mockResolvedValue(mockExams)
  })

  it('exibe a lista de exames com badges de tipo clínico e lida com exames antigos sem tipo', async () => {
    const user = userEvent.setup()
    const { container } = renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Rex')).toBeInTheDocument()
    })

    // Click on "Exames" tab
    const examesTabButton = screen.getByRole('button', { name: /Exames/i })
    await user.click(examesTabButton)

    // Verify table headers
    expect(screen.getByText('Tipo')).toBeInTheDocument()
    expect(screen.getByText('Arquivo')).toBeInTheDocument()
    expect(screen.getByText('Data do Upload')).toBeInTheDocument()

    // Verify exam files
    expect(screen.getByText('hemograma_rex.pdf')).toBeInTheDocument()
    expect(screen.getByText('raio_x_pata.png')).toBeInTheDocument()
    expect(screen.getByText('exame_antigo_sem_tipo.pdf')).toBeInTheDocument()

    // Verify badges
    const badges = container.querySelectorAll('.exam-type-badge')
    expect(badges).toHaveLength(3)
    expect(badges[0]).toHaveTextContent('Hemograma')
    expect(badges[1]).toHaveTextContent('Raio-X')
    expect(badges[2]).toHaveTextContent('Não informado')
  })

  it('filtra a lista de exames pelo tipo selecionado no dropdown', async () => {
    const user = userEvent.setup()
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Rex')).toBeInTheDocument()
    })

    // Click on "Exames" tab
    await user.click(screen.getByRole('button', { name: /Exames/i }))

    const filterSelect = screen.getByLabelText(/Filtrar por tipo de exame/i)

    // Filter by HEMOGRAMA
    await user.selectOptions(filterSelect, 'HEMOGRAMA')

    expect(screen.getByText('hemograma_rex.pdf')).toBeInTheDocument()
    expect(screen.queryByText('raio_x_pata.png')).not.toBeInTheDocument()
    expect(screen.queryByText('exame_antigo_sem_tipo.pdf')).not.toBeInTheDocument()

    // Filter by RAIO_X
    await user.selectOptions(filterSelect, 'RAIO_X')

    expect(screen.queryByText('hemograma_rex.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('raio_x_pata.png')).toBeInTheDocument()
    expect(screen.queryByText('exame_antigo_sem_tipo.pdf')).not.toBeInTheDocument()

    // Filter by UNSPECIFIED (legacy without type)
    await user.selectOptions(filterSelect, 'UNSPECIFIED')

    expect(screen.queryByText('hemograma_rex.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('raio_x_pata.png')).not.toBeInTheDocument()
    expect(screen.getByText('exame_antigo_sem_tipo.pdf')).toBeInTheDocument()

    // Return to ALL
    await user.selectOptions(filterSelect, 'ALL')

    expect(screen.getByText('hemograma_rex.pdf')).toBeInTheDocument()
    expect(screen.getByText('raio_x_pata.png')).toBeInTheDocument()
    expect(screen.getByText('exame_antigo_sem_tipo.pdf')).toBeInTheDocument()
  })

  it('exibe mensagem quando o filtro não encontra exames correspondentes', async () => {
    const user = userEvent.setup()
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Rex')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Exames/i }))

    const filterSelect = screen.getByLabelText(/Filtrar por tipo de exame/i)

    // Filter by ULTRASSOM (none)
    await user.selectOptions(filterSelect, 'ULTRASSOM')

    expect(
      screen.getByText('Nenhum exame encontrado para o filtro selecionado.')
    ).toBeInTheDocument()
  })
})
