import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { AppointmentsService } from '../appointments.service'

vi.mock('../api', () => ({ api: { get: vi.fn(), patch: vi.fn() } }))

describe('AppointmentsService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('envia o offset do fuso para o back filtrar o dia local do usuário', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { appointments: [] } })

    await AppointmentsService.listByDay('2026-11-12', 'vet-1')

    expect(api.get).toHaveBeenCalledWith('/appointments', {
      params: { date: '2026-11-12', vetId: 'vet-1', tzOffset: new Date().getTimezoneOffset() },
    })
  })

  it('desembrulha { appointment } na atualização', async () => {
    const appointment = { id: 'a1' }
    vi.mocked(api.patch).mockResolvedValue({ data: { appointment } })

    await expect(AppointmentsService.update('a1', {})).resolves.toBe(appointment)
  })
})
