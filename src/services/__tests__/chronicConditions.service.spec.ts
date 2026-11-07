import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChronicConditionsService } from '../chronicConditions.service'
import { api } from '../api'

vi.mock('../api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

describe('ChronicConditionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listByPatient consulta a rota do paciente e retorna os itens', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [{ id: 'cc-1' }] } })

    const result = await ChronicConditionsService.listByPatient('p-1')

    expect(api.get).toHaveBeenCalledWith('/chronic-conditions/patient/p-1')
    expect(result).toEqual([{ id: 'cc-1' }])
  })

  it('listByPatient retorna lista vazia quando a resposta não traz items', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: {} })

    expect(await ChronicConditionsService.listByPatient('p-1')).toEqual([])
  })

  it('create envia o payload por POST', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'cc-1' } })
    const payload = { patientId: 'p-1', name: 'Asma' }

    const result = await ChronicConditionsService.create(payload)

    expect(api.post).toHaveBeenCalledWith('/chronic-conditions', payload)
    expect(result).toEqual({ id: 'cc-1' })
  })

  it('update envia somente os campos informados por PATCH', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'cc-1', status: 'RESOLVED' } })

    const result = await ChronicConditionsService.update('cc-1', { status: 'RESOLVED' })

    expect(api.patch).toHaveBeenCalledWith('/chronic-conditions/cc-1', { status: 'RESOLVED' })
    expect(result).toEqual({ id: 'cc-1', status: 'RESOLVED' })
  })
})
