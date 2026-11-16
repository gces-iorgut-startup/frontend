import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VaccinationAlertsService } from '../vaccinationAlerts.service'
import { api } from '../../lib/api'

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

describe('VaccinationAlertsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve chamar a rota com o clinicId sem filtros adicionais', async () => {
    const mockData = { items: [], total: 0 }
    vi.mocked(api.get).mockResolvedValue({ data: mockData })

    const result = await VaccinationAlertsService.listByClinic('clinic-123')

    expect(api.get).toHaveBeenCalledWith('/clinics/clinic-123/vaccinations/alerts')
    expect(result).toEqual(mockData)
  })

  it('deve incluir os parâmetros de status e days na query string', async () => {
    const mockData = { items: [], total: 0 }
    vi.mocked(api.get).mockResolvedValue({ data: mockData })

    await VaccinationAlertsService.listByClinic('clinic-123', {
      status: 'OVERDUE',
      days: 30,
    })

    expect(api.get).toHaveBeenCalledWith(
      '/clinics/clinic-123/vaccinations/alerts?status=OVERDUE&days=30'
    )
  })
})
