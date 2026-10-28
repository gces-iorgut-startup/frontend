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

describe('RegisterPage — Fluxo de Cadastro Duplo (Dono vs. Veterinário)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve cadastrar nova clínica/usuário e redirecionar para /login (fluxo OWNER)', async () => {
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

  it('deve alternar entre Dono de Clínica e Médico Veterinário ajustando os campos', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    // Inicialmente Dono de Clínica está ativo
    expect(screen.getByLabelText(/Nome da clínica/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/CRMV/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('clinic-code-input')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Criar conta/i })).toBeInTheDocument()

    // Clica na aba de Médico Veterinário
    fireEvent.click(screen.getByTestId('tab-vet'))

    expect(screen.queryByLabelText(/Nome da clínica/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/CRMV/i)).toBeInTheDocument()
    expect(screen.getByTestId('clinic-code-input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cadastrar como Veterinário/i })).toBeInTheDocument()

    // O botão deve estar desabilitado enquanto a clínica não for validada
    expect(screen.getByRole('button', { name: /Cadastrar como Veterinário/i })).toBeDisabled()

    // Volta para Dono
    fireEvent.click(screen.getByTestId('tab-owner'))
    expect(screen.getByLabelText(/Nome da clínica/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/CRMV/i)).not.toBeInTheDocument()
  })

  it('deve preservar nome e e-mail já digitados ao alternar entre Dono e Veterinário', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Seu nome/i), { target: { value: 'Dra. Camila' } })
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'camila@petlife.com' } })

    fireEvent.click(screen.getByTestId('tab-vet'))
    expect(screen.getByLabelText(/Seu nome/i)).toHaveValue('Dra. Camila')
    expect(screen.getByLabelText(/E-mail/i)).toHaveValue('camila@petlife.com')

    fireEvent.click(screen.getByTestId('tab-owner'))
    expect(screen.getByLabelText(/Seu nome/i)).toHaveValue('Dra. Camila')
    expect(screen.getByLabelText(/E-mail/i)).toHaveValue('camila@petlife.com')
  })

  it('deve cadastrar médico veterinário vinculado a uma clínica existente e redirecionar para /login', async () => {
    vi.mocked(clinicService.getClinicByCode).mockResolvedValueOnce({
      id: 'clinic-xyz',
      name: 'PetLife Matriz',
      code: 'PETLIFE-MTZ',
    })

    vi.mocked(authService.registerVet).mockResolvedValueOnce({
      user: {
        id: 'vet-10',
        name: 'Dr. Lucas Silva',
        email: 'lucas@petlife.com',
        role: 'VET',
        clinicId: 'clinic-xyz',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>Tela de Login pós cadastro</div>} />
        </Routes>
      </MemoryRouter>,
    )

    // Alterna para VET
    fireEvent.click(screen.getByTestId('tab-vet'))

    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dr. Lucas Silva' },
    })
    fireEvent.change(screen.getByLabelText(/CRMV/i), {
      target: { value: 'SP 12345' },
    })
    fireEvent.blur(screen.getByLabelText(/CRMV/i))

    fireEvent.change(screen.getByTestId('clinic-code-input'), {
      target: { value: 'PETLIFE-MTZ' },
    })

    // Aguarda debounce e resolução da clínica
    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-success-msg')).toHaveTextContent('PetLife Matriz')
    })

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'lucas@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaSegura123' },
    })

    const submitBtn = screen.getByRole('button', { name: /Cadastrar como Veterinário/i })
    expect(submitBtn).not.toBeDisabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(authService.registerVet).toHaveBeenCalledWith({
        name: 'Dr. Lucas Silva',
        email: 'lucas@petlife.com',
        password: 'SenhaSegura123',
        crmv: 'CRMV-SP 12345',
        clinicCode: 'PETLIFE-MTZ',
      })
      expect(screen.getByText('Tela de Login pós cadastro')).toBeInTheDocument()
    })
  })

  it('deve validar CRMV inválido ao submeter o formulário de veterinário', async () => {
    vi.mocked(clinicService.getClinicByCode).mockResolvedValueOnce({
      id: 'clinic-xyz',
      name: 'PetLife Matriz',
      code: 'PETLIFE-MTZ',
    })

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByTestId('tab-vet'))

    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dr. Invalido' },
    })
    fireEvent.change(screen.getByLabelText(/CRMV/i), {
      target: { value: '123' }, // formato inválido
    })
    fireEvent.change(screen.getByTestId('clinic-code-input'), {
      target: { value: 'PETLIFE-MTZ' },
    })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-success-msg')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'invalido@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaSegura123' },
    })

    // Submete com CRMV inválido
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar como Veterinário/i }))

    expect(
      await screen.findByText(/CRMV inválido. Utilize o formato CRMV-UF 12345/i),
    ).toBeInTheDocument()
    expect(authService.registerVet).not.toHaveBeenCalled()
  })
})
