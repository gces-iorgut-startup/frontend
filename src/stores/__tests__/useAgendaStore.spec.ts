import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAgendaStore } from '../useAgendaStore'
import { AppointmentsService } from '../../services/appointments.service'
import type { Appointment } from '../../types'

vi.mock('../../services/appointments.service', () => ({
  AppointmentsService: {
    listByDay: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    reschedule: vi.fn(),
  },
}))

const mockAppointment: Appointment = {
  id: 'apt-1',
  patientId: 'patient-1',
  vetId: 'vet-1',
  dateTime: '2026-10-27T14:00:00.000Z',
  endDateTime: '2026-10-27T14:30:00.000Z',
  category: 'VACCINATION',
  status: 'SCHEDULED',
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
}

describe('useAgendaStore (Zustand)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAgendaStore.setState({
      selectedDate: '2026-10-27',
      appointments: [],
      isLoading: false,
      error: null,
    })
  })

  it('deve buscar agendamentos do dia selecionado com sucesso em fetchAppointments', async () => {
    vi.mocked(AppointmentsService.listByDay).mockResolvedValueOnce([mockAppointment])

    await useAgendaStore.getState().fetchAppointments()

    const state = useAgendaStore.getState()
    expect(AppointmentsService.listByDay).toHaveBeenCalledWith('2026-10-27')
    expect(state.appointments).toEqual([mockAppointment])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('deve atualizar selectedDate e disparar busca ao chamar setDate', async () => {
    vi.mocked(AppointmentsService.listByDay).mockResolvedValueOnce([])

    useAgendaStore.getState().setDate('2026-11-01')

    expect(useAgendaStore.getState().selectedDate).toBe('2026-11-01')
    expect(AppointmentsService.listByDay).toHaveBeenCalledWith('2026-11-01')
  })

  it('deve registrar mensagem de erro quando fetchAppointments falhar', async () => {
    vi.mocked(AppointmentsService.listByDay).mockRejectedValueOnce({
      response: { data: { message: 'Falha ao consultar agenda' } },
    })

    await useAgendaStore.getState().fetchAppointments()

    const state = useAgendaStore.getState()
    expect(state.error).toBe('Falha ao consultar agenda')
    expect(state.isLoading).toBe(false)
  })

  it('deve criar, cancelar e reagendar consultas recarregando a lista', async () => {
    vi.mocked(AppointmentsService.create).mockResolvedValueOnce(mockAppointment)
    vi.mocked(AppointmentsService.cancel).mockResolvedValueOnce({
      ...mockAppointment,
      status: 'CANCELLED',
    })
    vi.mocked(AppointmentsService.reschedule).mockResolvedValueOnce(mockAppointment)
    vi.mocked(AppointmentsService.listByDay).mockResolvedValue([mockAppointment])

    await useAgendaStore.getState().createAppointment({
      patientId: 'patient-1',
      vetId: 'vet-1',
      dateTime: '2026-10-27T14:00:00.000Z',
      category: 'VACCINATION',
    })
    expect(AppointmentsService.create).toHaveBeenCalledTimes(1)

    await useAgendaStore.getState().cancelAppointment('apt-1', 'Imprevisto')
    expect(AppointmentsService.cancel).toHaveBeenCalledWith('apt-1', 'Imprevisto')

    await useAgendaStore
      .getState()
      .rescheduleAppointment('apt-1', '2026-10-28T10:00:00.000Z', '2026-10-28T10:30:00.000Z')
    expect(AppointmentsService.reschedule).toHaveBeenCalledWith('apt-1', {
      dateTime: '2026-10-28T10:00:00.000Z',
      endDateTime: '2026-10-28T10:30:00.000Z',
    })
  })
})

