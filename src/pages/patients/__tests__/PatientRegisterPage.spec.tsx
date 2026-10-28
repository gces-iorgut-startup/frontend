import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PatientRegisterPage } from '../PatientRegisterPage'
import * as cepLib from '../../../lib/cep'
import { api } from '../../../lib/api'

vi.mock('../../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

vi.mock('../../../lib/cep', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/cep')>()
  return {
    ...actual,
    fetchAddressByCep: vi.fn(),
  }
})

describe('PatientRegisterPage — Formulários e Máscaras de Input (CPF, Telefone, CEP, Data)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve aplicar máscaras progressivas em CPF, Telefone (Contato), CEP e Data de nascimento', async () => {
    const user = userEvent.setup({ delay: null })
    vi.mocked(cepLib.fetchAddressByCep).mockResolvedValueOnce({
      cep: '01001000',
      state: 'SP',
      city: 'São Paulo',
      neighborhood: 'Sé',
      street: 'Praça da Sé',
    })

    render(
      <MemoryRouter>
        <PatientRegisterPage />
      </MemoryRouter>,
    )

    const birthInput = screen.getByLabelText(/Data de nascimento/i) as HTMLInputElement
    const cpfInput = screen.getByLabelText(/CPF:/i) as HTMLInputElement
    const phoneInput = screen.getByLabelText(/Contato:/i) as HTMLInputElement
    const cepInput = screen.getByLabelText(/CEP:/i) as HTMLInputElement

    await user.type(birthInput, '15082021')
    expect(birthInput.value).toBe('15/08/2021')

    await user.type(cpfInput, '52998224725')
    expect(cpfInput.value).toBe('529.982.247-25')

    await user.type(phoneInput, '11987654321')
    expect(phoneInput.value).toBe('(11) 98765-4321')

    await user.type(cepInput, '01001000')
    expect(cepInput.value).toBe('01001-000')

    await waitFor(() => {
      expect(cepLib.fetchAddressByCep).toHaveBeenCalledWith(
        '01001000',
        expect.any(AbortSignal),
      )
      expect(screen.getByLabelText(/Logradouro:/i)).toHaveValue('Praça da Sé')
      expect(screen.getByLabelText(/Cidade:/i)).toHaveValue('São Paulo')
      expect(screen.getByLabelText(/Bairro:/i)).toHaveValue('Sé')
    })
  })

  it('deve exibir erro de CEP não encontrado quando o ViaCEP lançar CepNotFoundError', async () => {
    const user = userEvent.setup({ delay: null })
    vi.mocked(cepLib.fetchAddressByCep).mockRejectedValueOnce(new cepLib.CepNotFoundError())

    render(
      <MemoryRouter>
        <PatientRegisterPage />
      </MemoryRouter>,
    )

    const cepInput = screen.getByLabelText(/CEP:/i)
    await user.type(cepInput, '99999999')

    expect(await screen.findByText('CEP não encontrado')).toBeInTheDocument()
  })

  it('deve validar campos obrigatórios, CPF inválido e Telefone incompleto ao submeter o formulário', async () => {
    const user = userEvent.setup({ delay: null })

    render(
      <MemoryRouter>
        <PatientRegisterPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/CPF:/i), '11111111111')
    await user.type(screen.getByLabelText(/Contato:/i), '11999')

    await user.click(screen.getByRole('button', { name: /Finalizar cadastro/i }))

    expect(await screen.findByText('Nome do pet é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Espécie é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Raça é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('CPF inválido')).toBeInTheDocument()
    expect(screen.getByText('Telefone inválido')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('deve enviar payload limpo (CPF e Telefone apenas dígitos) ao cadastrar paciente com sucesso', async () => {
    const user = userEvent.setup({ delay: null })
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { tutor: { id: 'tutor-123' } } })
      .mockResolvedValueOnce({ data: { patient: { id: 'patient-123' } } })

    render(
      <MemoryRouter>
        <PatientRegisterPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/Nome do Pet/i), 'Bolt')
    await user.type(screen.getByLabelText(/Data de nascimento/i), '10052022')
    await user.selectOptions(screen.getByLabelText(/Espécie/i), 'Cachorro')
    await user.type(screen.getByLabelText(/Raça/i), 'Golden')
    await user.click(screen.getByLabelText('Masculino'))
    await user.click(screen.getByLabelText('Não'))

    await user.type(screen.getByLabelText(/Nome completo/i), 'Mariana Costa')
    await user.type(screen.getByLabelText(/CPF:/i), '52998224725')
    await user.type(screen.getByLabelText(/Contato:/i), '11988887777')

    await user.click(screen.getByRole('button', { name: /Finalizar cadastro/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/tutors',
        expect.objectContaining({
          fullName: 'Mariana Costa',
          cpf: '52998224725',
          phone: '11988887777',
        }),
      )
      expect(api.post).toHaveBeenCalledWith(
        '/patients',
        expect.objectContaining({
          name: 'Bolt',
          tutorId: 'tutor-123',
          species: 'Cachorro',
          breed: 'Golden',
        }),
      )
    })
  })
})
