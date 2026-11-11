import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../../lib/api'
import { PatientsListPage } from '../PatientsListPage'

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

function renderPage() {
  return render(<MemoryRouter><PatientsListPage /></MemoryRouter>)
}

describe('PatientsListPage - pesquisa avancada', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedGet.mockResolvedValue({ data: { patients: [], total: 0 } })
  })

  it('pesquisa pelo termo informado apos o debounce', async () => {
    const user = userEvent.setup()
    renderPage()

    const input = screen.getByPlaceholderText('Buscar por paciente, tutor ou CPF')
    await user.type(input, 'Maria')

    await waitFor(() => expect(mockedGet).toHaveBeenLastCalledWith('/patients', {
      params: expect.objectContaining({ search: 'Maria' }),
    }))
  })

  it('aceita CPF formatado como termo de pesquisa', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Buscar por paciente, tutor ou CPF'), '529.982.247-25')

    await waitFor(() => expect(mockedGet).toHaveBeenLastCalledWith('/patients', {
      params: expect.objectContaining({ search: '529.982.247-25' }),
    }))
  })

  it('orienta o usuario e nao pesquisa termos com apenas um caractere', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1))

    await user.type(screen.getByPlaceholderText('Buscar por paciente, tutor ou CPF'), 'a')

    expect(screen.getByText('Digite pelo menos 2 caracteres para pesquisar.')).toBeInTheDocument()
    await new Promise(resolve => window.setTimeout(resolve, 400))
    expect(mockedGet).toHaveBeenCalledTimes(1)
  })

  it('exibe estado vazio com o termo pesquisado', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('Buscar por paciente, tutor ou CPF'), 'inexistente')

    expect(await screen.findByText('Nenhum paciente encontrado para “inexistente”.')).toBeInTheDocument()
  })
})
