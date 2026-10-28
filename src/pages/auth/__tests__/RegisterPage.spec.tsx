import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegisterPage } from '../RegisterPage'
import { authService } from '../../../lib/authService'
import { clinicService } from '../../../lib/clinicService'

vi.mock('../../../lib/authService', () => ({
  authService: {
    register: vi.fn(),
    registerVet: vi.fn(),
    googleLogin: vi.fn(),
  },
}))

vi.mock('../../../lib/clinicService', () => ({
  clinicService: {
    getClinicByCode: vi.fn(),
  },
}))

function renderWithRoutes() {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Tela de Login</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillVetForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Médico Veterinário' }))
  fireEvent.change(screen.getByLabelText(/Seu nome/i), { target: { value: 'Dr. Rafael' } })
  fireEvent.change(screen.getByLabelText('CRMV'), { target: { value: 'CRMV-DF 1234' } })
  fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'rafael@petlife.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte123' } })
  fireEvent.change(screen.getByLabelText(/Sigla da clínica/i), { target: { value: 'petlife-7a2' } })
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve cadastrar nova clínica/usuário e redirecionar para /login', async () => {
    vi.mocked(authService.register).mockResolvedValueOnce({
      user: {
        id: 'owner-1',
        name: 'Dra. Camila',
        email: 'camila@petlife.com',
        role: 'OWNER',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>Tela de Login</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dra. Camila' },
    })
    fireEvent.change(screen.getByLabelText(/Nome da clínica/i), {
      target: { value: 'Clínica PetLife' },
    })
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'camila@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaForte123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar conta/i }))

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        name: 'Dra. Camila',
        clinicName: 'Clínica PetLife',
        email: 'camila@petlife.com',
        password: 'SenhaForte123',
      })
      expect(screen.getByText('Tela de Login')).toBeInTheDocument()
    })
  })

  it('deve exibir erro caso o e-mail já esteja em uso', async () => {
    vi.mocked(authService.register).mockRejectedValueOnce(
      new Error('E-mail já cadastrado.'),
    )

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dra. Camila' },
    })
    fireEvent.change(screen.getByLabelText(/Nome da clínica/i), {
      target: { value: 'Clínica PetLife' },
    })
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'camila@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaForte123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar conta/i }))

    expect(await screen.findByText('E-mail já cadastrado.')).toBeInTheDocument()
  })

  it('deve bloquear o cadastro de VET até a sigla da clínica ser validada', async () => {
    let resolveClinic: (value: { id: string; name: string; code: string }) => void = () => {}
    vi.mocked(clinicService.getClinicByCode).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveClinic = resolve
      }),
    )

    renderWithRoutes()
    fillVetForm()

    const submit = screen.getByRole('button', { name: 'Criar Conta de Veterinário' })
    expect(submit).toBeDisabled()

    await waitFor(() => {
      expect(clinicService.getClinicByCode).toHaveBeenCalledWith('PETLIFE-7A2')
    })
    expect(submit).toBeDisabled()

    resolveClinic({ id: 'clinic-1', name: 'Clínica PetLife', code: 'PETLIFE-7A2' })
    await waitFor(() => expect(submit).toBeEnabled())
  })

  it('deve cadastrar VET com a sigla validada e redirecionar para /login', async () => {
    vi.mocked(clinicService.getClinicByCode).mockResolvedValueOnce({
      id: 'clinic-1',
      name: 'Clínica PetLife',
      code: 'PETLIFE-7A2',
    })
    vi.mocked(authService.registerVet).mockResolvedValueOnce({
      user: {
        id: 'vet-1',
        name: 'Dr. Rafael',
        email: 'rafael@petlife.com',
        role: 'VET',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    renderWithRoutes()
    fillVetForm()

    const submit = screen.getByRole('button', { name: 'Criar Conta de Veterinário' })
    await waitFor(() => expect(submit).toBeEnabled())
    fireEvent.click(submit)

    await waitFor(() => {
      expect(authService.registerVet).toHaveBeenCalledWith({
        name: 'Dr. Rafael',
        email: 'rafael@petlife.com',
        password: 'SenhaForte123',
        crmv: 'CRMV-DF 1234',
        clinicCode: 'PETLIFE-7A2',
      })
      expect(screen.getByText('Tela de Login')).toBeInTheDocument()
    })
    expect(authService.register).not.toHaveBeenCalled()
  })

  it('deve manter o envio de VET bloqueado quando a sigla for inválida', async () => {
    vi.mocked(clinicService.getClinicByCode).mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Clínica não encontrada.' } },
    })

    renderWithRoutes()
    fillVetForm()

    expect(await screen.findByTestId('clinic-code-error-msg')).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: 'Criar Conta de Veterinário' })
    expect(submit).toBeDisabled()

    fireEvent.submit(submit.closest('form')!)
    expect(authService.registerVet).not.toHaveBeenCalled()
  })

  it('deve preservar nome e e-mail ao alternar entre Dono e Veterinário', () => {
    renderWithRoutes()

    fireEvent.change(screen.getByLabelText(/Seu nome/i), { target: { value: 'Dra. Camila' } })
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'camila@petlife.com' } })

    fireEvent.click(screen.getByRole('button', { name: 'Médico Veterinário' }))
    expect(screen.queryByLabelText(/Nome da clínica/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('CRMV')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dono de Clínica' }))
    expect(screen.getByLabelText(/Seu nome/i)).toHaveValue('Dra. Camila')
    expect(screen.getByLabelText(/E-mail/i)).toHaveValue('camila@petlife.com')
    expect(screen.getByLabelText(/Nome da clínica/i)).toBeInTheDocument()
  })
})
