import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChronicConditionsSection } from '../ChronicConditionsSection'
import { ChronicConditionsService } from '../../services/chronicConditions.service'
import { getLocalDateInputValue } from '../chronicConditionDates'
import type { ChronicCondition } from '../../types'

vi.mock('../../services/chronicConditions.service', () => ({
  ChronicConditionsService: {
    listByPatient: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

const PATIENT_ID = 'patient-uuid-123'

function makeCondition(overrides: Partial<ChronicCondition> = {}): ChronicCondition {
  return {
    id: 'cc-1',
    patientId: PATIENT_ID,
    name: 'Diabetes mellitus',
    diagnosedAt: '2026-03-10T12:00:00.000Z',
    status: 'ACTIVE',
    observations: 'Insulina 2x ao dia',
    createdAt: '2026-03-10T12:00:00.000Z',
    updatedAt: '2026-03-10T12:00:00.000Z',
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('ChronicConditionsSection — Patologias Crônicas (CLI-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listagem', () => {
    it('exibe estado de carregamento enquanto busca as patologias', () => {
      vi.mocked(ChronicConditionsService.listByPatient).mockReturnValue(new Promise(() => {}))

      render(<ChronicConditionsSection patientId={PATIENT_ID} />)

      expect(screen.getByTestId('chronic-conditions-loading')).toBeInTheDocument()
      expect(ChronicConditionsService.listByPatient).toHaveBeenCalledWith(PATIENT_ID)
    })

    it('exibe estado vazio com chamada para registrar', async () => {
      vi.mocked(ChronicConditionsService.listByPatient).mockResolvedValue([])

      render(<ChronicConditionsSection patientId={PATIENT_ID} />)

      expect(await screen.findByTestId('chronic-conditions-empty')).toBeInTheDocument()
      expect(screen.getByText('Nenhuma patologia crônica registrada')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Registrar Patologia/i })).toBeInTheDocument()
    })

    it('lista as patologias com data civil, status e observações', async () => {
      vi.mocked(ChronicConditionsService.listByPatient).mockResolvedValue([
        makeCondition(),
        makeCondition({
          id: 'cc-2',
          name: 'Asma',
          diagnosedAt: null,
          status: 'RESOLVED',
          observations: null,
        }),
      ])

      render(<ChronicConditionsSection patientId={PATIENT_ID} />)

      const first = await screen.findByTestId('chronic-condition-row-cc-1')
      expect(within(first).getByText('Diabetes mellitus')).toBeInTheDocument()
      expect(within(first).getByText('10/03/2026')).toBeInTheDocument()
      expect(within(first).getByText('Ativa')).toBeInTheDocument()
      expect(within(first).getByText('Insulina 2x ao dia')).toBeInTheDocument()

      const second = screen.getByTestId('chronic-condition-row-cc-2')
      expect(within(second).getByText('Asma')).toBeInTheDocument()
      expect(within(second).getByText('Resolvida')).toBeInTheDocument()
      expect(within(second).getAllByText('—').length).toBeGreaterThanOrEqual(2)
    })

    it('exibe erro e permite tentar novamente', async () => {
      vi.mocked(ChronicConditionsService.listByPatient)
        .mockRejectedValueOnce(new Error('Falha de rede'))
        .mockResolvedValueOnce([makeCondition()])

      render(<ChronicConditionsSection patientId={PATIENT_ID} />)

      expect(await screen.findByTestId('chronic-conditions-error')).toHaveTextContent('Falha de rede')

      await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

      expect(await screen.findByTestId('chronic-condition-row-cc-1')).toBeInTheDocument()
      expect(screen.queryByTestId('chronic-conditions-error')).not.toBeInTheDocument()
      expect(ChronicConditionsService.listByPatient).toHaveBeenCalledTimes(2)
    })

    it('oculta as ações de edição quando canEdit é falso', async () => {
      vi.mocked(ChronicConditionsService.listByPatient).mockResolvedValue([makeCondition()])

      render(<ChronicConditionsSection patientId={PATIENT_ID} canEdit={false} />)

      await screen.findByTestId('chronic-condition-row-cc-1')
      expect(screen.queryByRole('button', { name: /Registrar Patologia/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Editar/i })).not.toBeInTheDocument()
    })

    it('recarrega as patologias quando o paciente muda', async () => {
      vi.mocked(ChronicConditionsService.listByPatient).mockResolvedValue([])

      const { rerender } = render(<ChronicConditionsSection patientId={PATIENT_ID} />)
      await screen.findByTestId('chronic-conditions-empty')

      rerender(<ChronicConditionsSection patientId="patient-other" />)

      await waitFor(() =>
        expect(ChronicConditionsService.listByPatient).toHaveBeenLastCalledWith('patient-other'),
      )
    })
  })

  describe('registro', () => {
    async function openCreateModal() {
      vi.mocked(ChronicConditionsService.listByPatient).mockResolvedValue([])
      render(<ChronicConditionsSection patientId={PATIENT_ID} />)
      await screen.findByTestId('chronic-conditions-empty')
      await userEvent.click(screen.getByRole('button', { name: /Registrar Patologia/i }))
      return screen.getByRole('dialog')
    }

    it('registra uma patologia enviando a data civil como 12:00 UTC e a exibe na lista', async () => {
      const created = makeCondition({ id: 'cc-new', name: 'Cardiopatia', observations: null })
      vi.mocked(ChronicConditionsService.create).mockResolvedValue(created)
      const dialog = await openCreateModal()

      await userEvent.type(within(dialog).getByLabelText(/Nome da Patologia/i), '  Cardiopatia ')
      fireEvent.change(within(dialog).getByLabelText(/Data do Diagnóstico/i), {
        target: { value: '2026-03-10' },
      })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Patologia' }))

      await waitFor(() =>
        expect(ChronicConditionsService.create).toHaveBeenCalledWith({
          patientId: PATIENT_ID,
          name: 'Cardiopatia',
          status: 'ACTIVE',
          diagnosedAt: '2026-03-10T12:00:00.000Z',
        }),
      )
      expect(await screen.findByTestId('chronic-condition-row-cc-new')).toBeInTheDocument()
      expect(screen.getByTestId('chronic-conditions-success')).toHaveTextContent(
        'Patologia registrada com sucesso.',
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('envia status e observações informados e omite a data quando vazia', async () => {
      vi.mocked(ChronicConditionsService.create).mockResolvedValue(makeCondition({ id: 'cc-new' }))
      const dialog = await openCreateModal()

      await userEvent.type(within(dialog).getByLabelText(/Nome da Patologia/i), 'Artrose')
      await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'INACTIVE')
      await userEvent.type(within(dialog).getByLabelText('Observações'), 'Acompanhar')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Patologia' }))

      await waitFor(() =>
        expect(ChronicConditionsService.create).toHaveBeenCalledWith({
          patientId: PATIENT_ID,
          name: 'Artrose',
          status: 'INACTIVE',
          observations: 'Acompanhar',
        }),
      )
    })

    it('valida o nome mínimo sem chamar a API', async () => {
      const dialog = await openCreateModal()

      await userEvent.type(within(dialog).getByLabelText(/Nome da Patologia/i), 'a')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Patologia' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('no mínimo 2 caracteres')
      expect(ChronicConditionsService.create).not.toHaveBeenCalled()
    })

    it('rejeita data de diagnóstico futura sem chamar a API', async () => {
      const dialog = await openCreateModal()
      const future = getLocalDateInputValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))

      await userEvent.type(within(dialog).getByLabelText(/Nome da Patologia/i), 'Asma')
      fireEvent.change(within(dialog).getByLabelText(/Data do Diagnóstico/i), { target: { value: future } })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Patologia' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('não pode ser futura')
      expect(ChronicConditionsService.create).not.toHaveBeenCalled()
    })

    it('exibe o erro da API e mantém o modal aberto para nova tentativa', async () => {
      vi.mocked(ChronicConditionsService.create).mockRejectedValue(new Error('Paciente não encontrado.'))
      const dialog = await openCreateModal()

      await userEvent.type(within(dialog).getByLabelText(/Nome da Patologia/i), 'Asma')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Patologia' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Paciente não encontrado.')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Salvar Patologia' })).toBeEnabled()
    })

    it('impede envio duplicado enquanto a requisição está em andamento', async () => {
      const pending = deferred<ChronicCondition>()
      vi.mocked(ChronicConditionsService.create).mockReturnValue(pending.promise)
      const dialog = await openCreateModal()

      await userEvent.type(within(dialog).getByLabelText(/Nome da Patologia/i), 'Asma')
      const form = within(dialog).getByRole('button', { name: 'Salvar Patologia' }).closest('form')!
      fireEvent.submit(form)
      fireEvent.submit(form)

      expect(ChronicConditionsService.create).toHaveBeenCalledTimes(1)
      expect(within(dialog).getByRole('button', { name: 'Salvando...' })).toBeDisabled()
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()

      pending.resolve(makeCondition({ id: 'cc-new' }))
      expect(await screen.findByTestId('chronic-condition-row-cc-new')).toBeInTheDocument()
    })

    it('fecha o modal ao cancelar sem chamar a API', async () => {
      const dialog = await openCreateModal()

      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(ChronicConditionsService.create).not.toHaveBeenCalled()
    })
  })

  describe('edição', () => {
    async function openEditModal(condition = makeCondition()) {
      vi.mocked(ChronicConditionsService.listByPatient).mockResolvedValue([condition])
      render(<ChronicConditionsSection patientId={PATIENT_ID} />)
      await screen.findByTestId(`chronic-condition-row-${condition.id}`)
      await userEvent.click(screen.getByRole('button', { name: `Editar ${condition.name}` }))
      return screen.getByRole('dialog')
    }

    it('pré-preenche o formulário com os dados da patologia', async () => {
      const dialog = await openEditModal()

      expect(within(dialog).getByLabelText(/Nome da Patologia/i)).toHaveValue('Diabetes mellitus')
      expect(within(dialog).getByLabelText(/Data do Diagnóstico/i)).toHaveValue('2026-03-10')
      expect(within(dialog).getByLabelText('Status')).toHaveValue('ACTIVE')
      expect(within(dialog).getByLabelText('Observações')).toHaveValue('Insulina 2x ao dia')
      expect(within(dialog).getByRole('button', { name: 'Salvar Alterações' })).toBeInTheDocument()
    })

    it('envia somente os campos alterados e atualiza a linha', async () => {
      vi.mocked(ChronicConditionsService.update).mockResolvedValue(makeCondition({ status: 'RESOLVED' }))
      const dialog = await openEditModal()

      await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'RESOLVED')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Alterações' }))

      await waitFor(() =>
        expect(ChronicConditionsService.update).toHaveBeenCalledWith('cc-1', { status: 'RESOLVED' }),
      )
      const row = await screen.findByTestId('chronic-condition-row-cc-1')
      expect(within(row).getByText('Resolvida')).toBeInTheDocument()
      expect(screen.getByTestId('chronic-conditions-success')).toHaveTextContent(
        'Patologia atualizada com sucesso.',
      )
    })

    it('limpa observações e data enviando null', async () => {
      vi.mocked(ChronicConditionsService.update).mockResolvedValue(
        makeCondition({ observations: null, diagnosedAt: null }),
      )
      const dialog = await openEditModal()

      await userEvent.clear(within(dialog).getByLabelText('Observações'))
      fireEvent.change(within(dialog).getByLabelText(/Data do Diagnóstico/i), { target: { value: '' } })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Alterações' }))

      await waitFor(() =>
        expect(ChronicConditionsService.update).toHaveBeenCalledWith('cc-1', {
          observations: null,
          diagnosedAt: null,
        }),
      )
    })

    it('não chama a API quando nada foi alterado', async () => {
      const dialog = await openEditModal()

      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Alterações' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(ChronicConditionsService.update).not.toHaveBeenCalled()
    })

    it('exibe o erro da API ao falhar a atualização', async () => {
      vi.mocked(ChronicConditionsService.update).mockRejectedValue(new Error('Patologia não encontrada.'))
      const dialog = await openEditModal()

      await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'INACTIVE')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Alterações' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Patologia não encontrada.')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
