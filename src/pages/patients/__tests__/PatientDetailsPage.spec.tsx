import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PatientDetailsPage } from '../PatientDetailsPage'
import { api } from '../../../lib/api'
import { clinicalService } from '../../../lib/clinicalService'
import { examService } from '../../../lib/examService'

vi.mock('../../../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('../../../lib/clinicalService', () => ({
  clinicalService: { getPatientHistory: vi.fn() },
}))
vi.mock('../../../lib/examService', () => ({
  examService: { listPatientExams: vi.fn() },
}))
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) => selector({ user: null }),
}))

describe('PatientDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(clinicalService.getPatientHistory).mockResolvedValue([])
    vi.mocked(examService.listPatientExams).mockResolvedValue([])
  })

  it('exibe os contatos alternativos do tutor', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        patient: {
          id: 'patient-1',
          name: 'Luna',
          species: 'CANINE',
          tutor: {
            id: 'tutor-1',
            fullName: 'Mariana Costa',
            cpf: '52998224725',
            phone: '11988887777',
            alternateContacts: [
              {
                name: 'João Silva',
                phone: '61999991111',
                relationship: 'Cônjuge',
                hasWhatsApp: true,
              },
            ],
          },
        },
      },
    })

    render(
      <MemoryRouter initialEntries={['/pacientes/patient-1']}>
        <Routes>
          <Route path="/pacientes/:id" element={<PatientDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Contatos alternativos')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Cônjuge')).toBeInTheDocument()
    expect(screen.getByText('(61) 99999-1111')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp disponível')).toBeInTheDocument()
  })
})
