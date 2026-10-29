import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RegisterPage } from '../RegisterPage'
import { LoginPage } from '../LoginPage'
import { authService } from '../../../lib/authService'
import { clinicService } from '../../../lib/clinicService'

vi.mock('../../../lib/authService', () => ({
  authService: {
    register: vi.fn(),
    registerVet: vi.fn(),
    login: vi.fn(),
    googleLogin: vi.fn(),
  },
}))

vi.mock('../../../lib/clinicService', () => ({
  clinicService: {
    getClinicByCode: vi.fn(),
  },
}))

describe('QA-05 — Fluxo Integrado de Autocadastro de Médico Veterinário', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve guiar o veterinário por todo o fluxo: seleção de perfil, validação de CRMV, validação da sigla e redirecionamento para o login', async () => {
    // 1. Mock do serviço de clínicas: código válido retorna dados da clínica
    vi.mocked(clinicService.getClinicByCode).mockImplementation(async (code) => {
      if (code === 'PETLIFE-7A2') {
        return {
          id: 'clinic-10',
          name: 'Hospital Veterinário PetLife',
          code: 'PETLIFE-7A2',
        }
      }
      const err = new Error('Not found') as Error & { response?: { status: number } }
      err.response = { status: 404 }
      throw err
    })

    // 2. Mock do registro do veterinário
    vi.mocked(authService.registerVet).mockResolvedValueOnce({
      user: {
        id: 'vet-uuid',
        name: 'Dr. Fernando Santos',
        email: 'fernando@petlife.com',
        role: 'VET',
        crmv: 'CRMV-DF 7890',
        clinicId: 'clinic-10',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })

    // Renderiza a aplicação com rotas de /register e /login
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    )

    // 3. Verifica estado inicial na aba Dono
    expect(screen.getByTestId('tab-owner')).toHaveClass('active')
    expect(screen.getByLabelText(/Nome da clínica/i)).toBeInTheDocument()

    // 4. Alterna para a aba de Médico Veterinário
    fireEvent.click(screen.getByTestId('tab-vet'))
    expect(screen.getByTestId('tab-vet')).toHaveClass('active')
    expect(screen.queryByLabelText(/Nome da clínica/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/CRMV/i)).toBeInTheDocument()
    expect(screen.getByTestId('clinic-code-input')).toBeInTheDocument()

    // Botão deve iniciar desabilitado
    const submitBtn = screen.getByRole('button', { name: /Cadastrar como Veterinário/i })
    expect(submitBtn).toBeDisabled()

    // 5. Preenche nome
    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dr. Fernando Santos' },
    })

    // 6. Preenche CRMV e testa normalização automática ao perder foco
    const crmvInput = screen.getByLabelText(/CRMV/i)
    fireEvent.change(crmvInput, { target: { value: 'df 7890' } })
    fireEvent.blur(crmvInput)
    expect(crmvInput).toHaveValue('CRMV-DF 7890')

    // 7. Testa digitação de sigla inexistente: feedback de erro e botão continua desabilitado
    const codeInput = screen.getByTestId('clinic-code-input')
    fireEvent.change(codeInput, { target: { value: 'ERRADO-999' } })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-error-msg')).toHaveTextContent(
        'Clínica não encontrada. Verifique a sigla com o responsável.',
      )
    })
    expect(submitBtn).toBeDisabled()

    // 8. Digita sigla correta: feedback de sucesso com nome da clínica e botão habilitado
    fireEvent.change(codeInput, { target: { value: 'PETLIFE-7A2' } })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-success-msg')).toHaveTextContent(
        'Hospital Veterinário PetLife',
      )
    })
    expect(submitBtn).not.toBeDisabled()

    // 9. Preenche e-mail e senha
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'fernando@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaSegura123' },
    })

    // 10. Submete o formulário obtendo o botão ativo e habilitado
    const activeSubmitBtn = screen.getByRole('button', { name: /Cadastrar como Veterinário/i })
    expect(activeSubmitBtn).not.toBeDisabled()
    fireEvent.click(activeSubmitBtn)

    // 11. Valida payload enviado à API e transição para tela de Login com toast
    await waitFor(() => {
      expect(authService.registerVet).toHaveBeenCalledWith({
        name: 'Dr. Fernando Santos',
        email: 'fernando@petlife.com',
        password: 'SenhaSegura123',
        crmv: 'CRMV-DF 7890',
        clinicCode: 'PETLIFE-7A2',
      })
      // Na tela de login, deve ser exibida a mensagem de confirmação
      expect(
        screen.getByText('Cadastro de veterinário realizado com sucesso! Faça login para continuar.'),
      ).toBeInTheDocument()
    })
  })

  it('deve exibir mensagem de erro da API quando o e-mail ou CRMV já estiverem em uso', async () => {
    vi.mocked(clinicService.getClinicByCode).mockResolvedValueOnce({
      id: 'clinic-10',
      name: 'Clínica PetLife',
      code: 'PETLIFE-7A2',
    })

    const conflictError = new Error('E-mail já cadastrado.')
    vi.mocked(authService.registerVet).mockRejectedValueOnce(conflictError)

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByTestId('tab-vet'))

    fireEvent.change(screen.getByLabelText(/Seu nome/i), {
      target: { value: 'Dra. Beatriz' },
    })
    fireEvent.change(screen.getByLabelText(/CRMV/i), {
      target: { value: 'SP 44332' },
    })
    fireEvent.change(screen.getByTestId('clinic-code-input'), {
      target: { value: 'PETLIFE-7A2' },
    })

    await waitFor(() => {
      expect(screen.getByTestId('clinic-code-success-msg')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'ja_existe@petlife.com' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'SenhaSegura123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Cadastrar como Veterinário/i }))

    expect(await screen.findByText('E-mail já cadastrado.')).toBeInTheDocument()
  })
})
