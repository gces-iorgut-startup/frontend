import { describe, it, expect } from 'vitest'
import {
  formatWeightValue,
  getChartGeometry,
  getWeightReadings,
  getWeightSeries,
} from '../weightEvolution'
import type { ClinicalHistoryItem } from '../../types'

function record(overrides: Partial<ClinicalHistoryItem> = {}): ClinicalHistoryItem {
  return {
    id: 'record-1',
    patientId: 'patient-1',
    vetId: 'vet-1',
    appointmentId: null,
    weightKg: 12.5,
    finalized: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('getWeightReadings', () => {
  it('devolve lista vazia sem histórico', () => {
    expect(getWeightReadings([])).toEqual([])
  })

  it('ignora atendimentos não finalizados', () => {
    // Um atendimento em andamento ainda pode ter o peso corrigido.
    const readings = getWeightReadings([record({ id: 'a', finalized: false })])

    expect(readings).toHaveLength(0)
  })

  it('ignora atendimentos sem peso', () => {
    const readings = getWeightReadings([record({ id: 'a', weightKg: null })])

    expect(readings).toHaveLength(0)
  })

  it('ignora peso zero ou negativo', () => {
    const readings = getWeightReadings([
      record({ id: 'a', weightKg: 0 }),
      record({ id: 'b', weightKg: -3 }),
    ])

    expect(readings).toHaveLength(0)
  })

  it('ordena cronologicamente de forma crescente', () => {
    const readings = getWeightReadings([
      record({ id: 'recente', createdAt: '2026-03-01T10:00:00.000Z', weightKg: 14 }),
      record({ id: 'antigo', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 12 }),
    ])

    expect(readings.map((reading) => reading.recordId)).toEqual(['antigo', 'recente'])
  })

  it('usa a data do agendamento quando existe, não a de criação', () => {
    const readings = getWeightReadings([
      record({
        createdAt: '2026-05-01T10:00:00.000Z',
        appointment: {
          id: 'appt-1',
          category: 'OBSERVATION',
          dateTime: '2026-02-01T10:00:00.000Z',
        },
      }),
    ])

    expect(readings[0].date.toISOString()).toBe('2026-02-01T10:00:00.000Z')
  })

  it('descarta registro com data inválida', () => {
    expect(getWeightReadings([record({ createdAt: 'data-quebrada' })])).toHaveLength(0)
  })
})

describe('getWeightSeries', () => {
  it('devolve série neutra sem aferições', () => {
    expect(getWeightSeries([])).toEqual({
      readings: [],
      minWeight: 0,
      maxWeight: 0,
      variation: 0,
    })
  })

  it('calcula mínimo, máximo e variação', () => {
    const series = getWeightSeries([
      record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 12 }),
      record({ id: 'b', createdAt: '2026-02-01T10:00:00.000Z', weightKg: 15 }),
      record({ id: 'c', createdAt: '2026-03-01T10:00:00.000Z', weightKg: 14 }),
    ])

    expect(series.minWeight).toBe(12)
    expect(series.maxWeight).toBe(15)
    expect(series.variation).toBe(2)
  })

  it('devolve variação negativa quando o paciente perde peso', () => {
    const series = getWeightSeries([
      record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 15 }),
      record({ id: 'b', createdAt: '2026-02-01T10:00:00.000Z', weightKg: 12 }),
    ])

    expect(series.variation).toBe(-3)
  })
})

describe('getChartGeometry', () => {
  const options = { width: 100, height: 100, padding: 10 }

  it('devolve geometria vazia sem aferições', () => {
    expect(getChartGeometry([], options)).toEqual({ points: [], polyline: '', yTicks: [] })
  })

  it('coloca a aferição mais leve embaixo e a mais pesada em cima', () => {
    const { points } = getChartGeometry(
      getWeightReadings([
        record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 10 }),
        record({ id: 'b', createdAt: '2026-02-01T10:00:00.000Z', weightKg: 20 }),
      ]),
      options
    )

    expect(points[0].y).toBe(90)
    expect(points[1].y).toBe(10)
  })

  it('distribui os pontos por posição, ignorando o intervalo entre consultas', () => {
    // Datas muito desiguais de propósito: escalar por tempo esmagaria os
    // pontos próximos até ficarem ilegíveis.
    const { points } = getChartGeometry(
      getWeightReadings([
        record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 10 }),
        record({ id: 'b', createdAt: '2026-01-02T10:00:00.000Z', weightKg: 15 }),
        record({ id: 'c', createdAt: '2027-01-01T10:00:00.000Z', weightKg: 20 }),
      ]),
      options
    )

    expect(points.map((point) => point.x)).toEqual([10, 50, 90])
  })

  it('centraliza o ponto único no eixo horizontal', () => {
    const { points } = getChartGeometry(getWeightReadings([record()]), options)

    expect(points[0].x).toBe(50)
  })

  it('não estoura quando o peso não varia', () => {
    const { points } = getChartGeometry(
      getWeightReadings([
        record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 12 }),
        record({ id: 'b', createdAt: '2026-02-01T10:00:00.000Z', weightKg: 12 }),
      ]),
      options
    )

    // Faixa artificial de 1kg: a linha cai no meio da área útil (altura 100,
    // padding 10 → meio em y=50) em vez de dividir por zero.
    expect(points.every((point) => Number.isFinite(point.y))).toBe(true)
    expect(points[0].y).toBe(50)
    expect(points[1].y).toBe(50)
  })

  it('monta a string da polyline a partir dos pontos', () => {
    const geometry = getChartGeometry(
      getWeightReadings([
        record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 10 }),
        record({ id: 'b', createdAt: '2026-02-01T10:00:00.000Z', weightKg: 20 }),
      ]),
      options
    )

    expect(geometry.polyline).toBe('10,90 90,10')
  })

  it('devolve três marcas no eixo vertical, da maior para a menor', () => {
    const { yTicks } = getChartGeometry(
      getWeightReadings([
        record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 10 }),
        record({ id: 'b', createdAt: '2026-02-01T10:00:00.000Z', weightKg: 20 }),
      ]),
      options
    )

    expect(yTicks.map((tick) => tick.value)).toEqual([20, 15, 10])
  })
})

describe('formatWeightValue', () => {
  it('formata com uma decimal e vírgula', () => {
    expect(formatWeightValue(12.5)).toBe('12,5 kg')
    expect(formatWeightValue(12)).toBe('12,0 kg')
  })
})
