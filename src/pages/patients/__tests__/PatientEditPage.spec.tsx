import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api } from '../../../lib/api'
import { PatientEditPage } from '../PatientEditPage'

vi.mock('../../../lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe('PatientEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        patient: {
          id: 'patient-1',
          name: 'Luna',
          species: 'CANINE',
          sex: 'FEMALE',
          breed: null,
          birthDate: null,
          weightKg: null,
          microchip: null,
          reproductiveCondition: null,
          coatDescription: null,
          tutor: {
            id: 'tutor-1',
            fullName: 'Mariana Costa',
            cpf: '52998224725',
            phone: '11988887777',
            email: null,
            insurance: null,
            address: null,
            alternateContacts: [],
          },
        },
      },
    })
    vi.mocked(api.put).mockResolvedValue({ data: { patient: { id: 'patient-1' } } })
  })

  it('salva alterações mesmo quando os dados opcionais antigos estão vazios', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <MemoryRouter initialEntries={['/pacientes/patient-1/editar']}>
        <Routes>
          <Route path="/pacientes/:id/editar" element={<PatientEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const coatDescription = await screen.findByLabelText(/Descrição da pelagem/i)
    await user.type(coatDescription, 'Caramelo e curta')
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }))
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }))

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/patients/patient-1',
        expect.objectContaining({
          species: 'CANINE',
          sex: 'FEMALE',
          coatDescription: 'Caramelo e curta',
          tutor: expect.objectContaining({
            cpf: '52998224725',
            fullName: 'Mariana Costa',
            phone: '11988887777',
            alternateContacts: [],
          }),
        }),
      )
    })
  })

  it('carrega e permite remover os contatos alternativos do tutor', async () => {
    const user = userEvent.setup({ delay: null })
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        patient: {
          id: 'patient-1',
          name: 'Luna',
          species: 'CANINE',
          sex: 'FEMALE',
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
      <MemoryRouter initialEntries={['/pacientes/patient-1/editar']}>
        <Routes>
          <Route path="/pacientes/:id/editar" element={<PatientEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('João Silva')).toBeInTheDocument()
    expect(screen.getByDisplayValue('(61) 99999-1111')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Remover contato alternativo 1/i }))
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }))
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }))

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/patients/patient-1',
        expect.objectContaining({
          tutor: expect.objectContaining({ alternateContacts: [] }),
        }),
      )
    })
  })
})
