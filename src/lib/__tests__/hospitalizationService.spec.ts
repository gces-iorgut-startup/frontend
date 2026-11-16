import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { hospitalizationService } from '../hospitalizationService'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    defaults: { baseURL: '/api' },
  },
}))

// `vi.mocked(api)` não faz deep-mock: os métodos continuam com a assinatura
// sobrecarregada do axios, sem os helpers de mock. Daí o cast explícito.
const mockedApi = {
  get: api.get as unknown as Mock,
  post: api.post as unknown as Mock,
  patch: api.patch as unknown as Mock,
}

const CLINIC_ID = 'clinic-1'
const HOSPITALIZATION_ID = 'hosp-1'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listActive', () => {
  it('monta a URL com a clínica no caminho', async () => {
    mockedApi.get.mockResolvedValue({ data: { items: [] } })

    await hospitalizationService.listActive(CLINIC_ID)

    expect(mockedApi.get).toHaveBeenCalledWith('/clinics/clinic-1/hospitalizations/active')
  })

  it('devolve lista vazia quando a resposta não traz items', async () => {
    mockedApi.get.mockResolvedValue({ data: {} })

    expect(await hospitalizationService.listActive(CLINIC_ID)).toEqual([])
  })
})

describe('getDetails', () => {
  it('busca a internação pelo id', async () => {
    mockedApi.get.mockResolvedValue({ data: { id: HOSPITALIZATION_ID, evolutions: [] } })

    const details = await hospitalizationService.getDetails(CLINIC_ID, HOSPITALIZATION_ID)

    expect(mockedApi.get).toHaveBeenCalledWith('/clinics/clinic-1/hospitalizations/hosp-1')
    expect(details.id).toBe(HOSPITALIZATION_ID)
  })
})

describe('admitPatient', () => {
  it('envia o corpo sem espaços nas pontas', async () => {
    mockedApi.post.mockResolvedValue({ data: {} })

    await hospitalizationService.admitPatient(CLINIC_ID, {
      patientId: 'patient-1',
      bedIdentifier: '  Baia 03  ',
      reason: '  Pós-operatório  ',
    })

    expect(mockedApi.post).toHaveBeenCalledWith('/clinics/clinic-1/hospitalizations', {
      patientId: 'patient-1',
      bedIdentifier: 'Baia 03',
      reason: 'Pós-operatório',
    })
  })
})

describe('addEvolution', () => {
  it('omite sinal vital não informado em vez de mandar undefined', async () => {
    // Campo em branco significa "não aferi". Mandar a chave faria o backend
    // gravar null sobre nada e poluiria a timeline.
    mockedApi.post.mockResolvedValue({ data: {} })

    await hospitalizationService.addEvolution(CLINIC_ID, HOSPITALIZATION_ID, {
      notes: 'Medicação aplicada',
    })

    const [, payload] = mockedApi.post.mock.calls[0]
    expect(payload).toEqual({ notes: 'Medicação aplicada' })
    expect('temperature' in payload).toBe(false)
    expect('heartRate' in payload).toBe(false)
    expect('mucousMembranes' in payload).toBe(false)
  })

  it('envia os sinais vitais informados', async () => {
    mockedApi.post.mockResolvedValue({ data: {} })

    await hospitalizationService.addEvolution(CLINIC_ID, HOSPITALIZATION_ID, {
      temperature: 38.5,
      heartRate: 90,
      respiratoryRate: 24,
      mucousMembranes: '  Normocoradas  ',
      notes: '  Aceitou ração  ',
    })

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/clinics/clinic-1/hospitalizations/hosp-1/evolutions',
      {
        temperature: 38.5,
        heartRate: 90,
        respiratoryRate: 24,
        mucousMembranes: 'Normocoradas',
        notes: 'Aceitou ração',
      }
    )
  })

  it('mantém zero como valor aferido', async () => {
    // 0 é falsy, mas é uma aferição válida — não pode ser confundido com vazio.
    mockedApi.post.mockResolvedValue({ data: {} })

    await hospitalizationService.addEvolution(CLINIC_ID, HOSPITALIZATION_ID, {
      heartRate: 0,
      notes: 'Parada cardíaca',
    })

    const [, payload] = mockedApi.post.mock.calls[0]
    expect(payload.heartRate).toBe(0)
  })
})

describe('discharge', () => {
  it('envia as orientações quando preenchidas', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} })

    await hospitalizationService.discharge(CLINIC_ID, HOSPITALIZATION_ID, '  Repouso 7 dias  ')

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/clinics/clinic-1/hospitalizations/hosp-1/discharge',
      { dischargeNotes: 'Repouso 7 dias' }
    )
  })

  it('envia corpo vazio quando não há orientações', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} })

    await hospitalizationService.discharge(CLINIC_ID, HOSPITALIZATION_ID)

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/clinics/clinic-1/hospitalizations/hosp-1/discharge',
      {}
    )
  })

  it('trata orientação só com espaços como ausente', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} })

    await hospitalizationService.discharge(CLINIC_ID, HOSPITALIZATION_ID, '    ')

    const [, payload] = mockedApi.patch.mock.calls[0]
    expect(payload).toEqual({})
  })
})

describe('admitPatient — status', () => {
  it('omite a chave quando nao informado', async () => {
    // Em branco, o backend assume ADMITTED. Mandar undefined explicito faria
    // o Zod receber a chave e reclamar.
    mockedApi.post.mockResolvedValue({ data: {} })

    await hospitalizationService.admitPatient(CLINIC_ID, {
      patientId: 'patient-1',
      bedIdentifier: 'Baia 03',
      reason: 'Observacao',
    })

    const [, payload] = mockedApi.post.mock.calls[0]
    expect('status' in payload).toBe(false)
  })

  it('envia CRITICAL quando a admissao e critica', async () => {
    mockedApi.post.mockResolvedValue({ data: {} })

    await hospitalizationService.admitPatient(CLINIC_ID, {
      patientId: 'patient-1',
      bedIdentifier: 'UTI 01',
      reason: 'Choque',
      status: 'CRITICAL',
    })

    const [, payload] = mockedApi.post.mock.calls[0]
    expect(payload.status).toBe('CRITICAL')
  })
})

describe('updateStatus', () => {
  it('chama a rota de status com o valor novo', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} })

    await hospitalizationService.updateStatus(CLINIC_ID, HOSPITALIZATION_ID, 'CRITICAL')

    expect(mockedApi.patch).toHaveBeenCalledWith(
      '/clinics/clinic-1/hospitalizations/hosp-1/status',
      { status: 'CRITICAL' }
    )
  })

  it('tambem volta para ADMITTED', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} })

    await hospitalizationService.updateStatus(CLINIC_ID, HOSPITALIZATION_ID, 'ADMITTED')

    const [, payload] = mockedApi.patch.mock.calls[0]
    expect(payload.status).toBe('ADMITTED')
  })
})
