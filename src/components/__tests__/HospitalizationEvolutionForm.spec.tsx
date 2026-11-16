import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HospitalizationEvolutionForm } from '../HospitalizationEvolutionForm'
import { hospitalizationService } from '../../lib/hospitalizationService'

vi.mock('../../lib/hospitalizationService', () => ({
  hospitalizationService: {
    addEvolution: vi.fn(),
  },
}))

const mockedService = vi.mocked(hospitalizationService)

function renderForm(overrides: { onSuccess?: () => void; onError?: () => void } = {}) {
  const onSuccess = overrides.onSuccess ?? vi.fn()
  const onError = overrides.onError ?? vi.fn()

  render(
    <HospitalizationEvolutionForm
      clinicId="clinic-1"
      hospitalizationId="hosp-1"
      onSuccess={onSuccess}
      onError={onError}
    />
  )

  return { onSuccess, onError }
}

describe('HospitalizationEvolutionForm — validação (EVO-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exige a anotação do plantão', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Descreva a evolução do paciente.')
    expect(mockedService.addEvolution).not.toHaveBeenCalled()
  })

  it('não aceita anotação só com espaços', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Observações do plantão'), '   ')
    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mockedService.addEvolution).not.toHaveBeenCalled()
  })

  it('aceita aferição só com anotação, sem sinais vitais', async () => {
    const user = userEvent.setup()
    mockedService.addEvolution.mockResolvedValue({
      id: 'evo-1',
      hospitalizationId: 'hosp-1',
      recordedByVetId: 'vet-1',
      temperature: null,
      heartRate: null,
      respiratoryRate: null,
      mucousMembranes: null,
      notes: 'Medicação aplicada',
      recordedAt: '2026-11-13T15:00:00.000Z',
    })

    const { onSuccess } = renderForm()

    await user.type(screen.getByLabelText('Observações do plantão'), 'Medicação aplicada')
    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockedService.addEvolution).toHaveBeenCalledWith('clinic-1', 'hosp-1', {
      temperature: undefined,
      heartRate: undefined,
      respiratoryRate: undefined,
      mucousMembranes: '',
      notes: 'Medicação aplicada',
    })
  })

  it('barra frequência cardíaca fora da faixa antes de chamar a API', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Observações do plantão'), 'Aferição')
    await user.type(screen.getByLabelText('FC (bpm)'), '2000')
    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    expect(screen.getByRole('alert')).toHaveTextContent('entre 10 e 400')
    expect(mockedService.addEvolution).not.toHaveBeenCalled()
  })

  it('barra texto no lugar de número', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Observações do plantão'), 'Aferição')
    await user.type(screen.getByLabelText('Temperatura (°C)'), 'febre')
    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    expect(screen.getByRole('alert')).toHaveTextContent('deve ser um número')
    expect(mockedService.addEvolution).not.toHaveBeenCalled()
  })

  it('aceita temperatura com vírgula', async () => {
    const user = userEvent.setup()
    mockedService.addEvolution.mockResolvedValue({
      id: 'evo-1',
      hospitalizationId: 'hosp-1',
      recordedByVetId: 'vet-1',
      temperature: 38.5,
      heartRate: null,
      respiratoryRate: null,
      mucousMembranes: null,
      notes: 'Aferição',
      recordedAt: '2026-11-13T15:00:00.000Z',
    })

    renderForm()

    await user.type(screen.getByLabelText('Observações do plantão'), 'Aferição')
    await user.type(screen.getByLabelText('Temperatura (°C)'), '38,5')
    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    await waitFor(() => expect(mockedService.addEvolution).toHaveBeenCalled())
    const [, , payload] = mockedService.addEvolution.mock.calls[0]
    expect(payload.temperature).toBe(38.5)
  })

  it('limpa o formulário depois de registrar', async () => {
    const user = userEvent.setup()
    mockedService.addEvolution.mockResolvedValue({
      id: 'evo-1',
      hospitalizationId: 'hosp-1',
      recordedByVetId: 'vet-1',
      temperature: null,
      heartRate: null,
      respiratoryRate: null,
      mucousMembranes: null,
      notes: 'Aferição',
      recordedAt: '2026-11-13T15:00:00.000Z',
    })

    renderForm()
    const notes = screen.getByLabelText('Observações do plantão')

    await user.type(notes, 'Aferição')
    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    await waitFor(() => expect(notes).toHaveValue(''))
  })

  it('avisa o pai quando a API falha', async () => {
    const user = userEvent.setup()
    // `getErrorMessage` devolve a mensagem do Error quando ela existe, então
    // usamos Error vazio para cair no texto padrão.
    mockedService.addEvolution.mockRejectedValue(new Error())

    const { onError } = renderForm()

    await user.type(screen.getByLabelText('Observações do plantão'), 'Aferição')
    await user.click(screen.getByRole('button', { name: 'Registrar aferição' }))

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith('Não foi possível registrar a evolução.')
    )
  })
})
