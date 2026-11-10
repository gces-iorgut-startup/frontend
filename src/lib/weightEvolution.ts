import type { ClinicalHistoryItem } from '../types'

export interface WeightReading {
  recordId: string
  date: Date
  weightKg: number
}

export interface WeightSeries {
  readings: WeightReading[]
  minWeight: number
  maxWeight: number
  variation: number
}

/**
 * Extrai as aferições de peso do histórico de prontuários.
 *
 * Só entram registros finalizados e com peso: um atendimento em andamento
 * ainda pode ter o peso corrigido, e não faz sentido mexer na curva por isso.
 * A ordem é cronológica crescente — é uma curva de evolução.
 */
export function getWeightReadings(history: ClinicalHistoryItem[]): WeightReading[] {
  return history
    .filter((item) => item.finalized && item.weightKg != null)
    .map((item) => ({
      recordId: item.id,
      date: new Date(item.appointment?.dateTime ?? item.createdAt),
      weightKg: Number(item.weightKg),
    }))
    .filter((reading) => !Number.isNaN(reading.date.getTime()) && reading.weightKg > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function getWeightSeries(history: ClinicalHistoryItem[]): WeightSeries {
  const readings = getWeightReadings(history)

  if (readings.length === 0) {
    return { readings, minWeight: 0, maxWeight: 0, variation: 0 }
  }

  const weights = readings.map((reading) => reading.weightKg)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const variation = readings[readings.length - 1].weightKg - readings[0].weightKg

  return { readings, minWeight, maxWeight, variation }
}

export interface ChartPoint extends WeightReading {
  x: number
  y: number
}

export interface ChartGeometry {
  points: ChartPoint[]
  polyline: string
  yTicks: { value: number; y: number }[]
}

/**
 * Projeta as aferições nas coordenadas do SVG.
 *
 * O eixo X é por posição, não por data: as consultas são espaçadas de forma
 * irregular e escalar por tempo esmaga os pontos próximos até ficarem
 * ilegíveis. Para leitura clínica, a sequência importa mais que o intervalo.
 */
export function getChartGeometry(
  readings: WeightReading[],
  options: { width: number; height: number; padding: number }
): ChartGeometry {
  const { width, height, padding } = options
  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2

  if (readings.length === 0) {
    return { points: [], polyline: '', yTicks: [] }
  }

  const weights = readings.map((reading) => reading.weightKg)
  const rawMin = Math.min(...weights)
  const rawMax = Math.max(...weights)

  // Com peso estável a amplitude é zero e a divisão estouraria. Abrimos uma
  // faixa artificial de 1kg para a linha cair no meio do gráfico.
  const span = rawMax - rawMin
  const min = span === 0 ? rawMin - 0.5 : rawMin
  const max = span === 0 ? rawMax + 0.5 : rawMax
  const range = max - min

  const points: ChartPoint[] = readings.map((reading, index) => {
    const ratio = readings.length === 1 ? 0.5 : index / (readings.length - 1)
    return {
      ...reading,
      x: padding + ratio * plotWidth,
      y: padding + (1 - (reading.weightKg - min) / range) * plotHeight,
    }
  })

  const yTicks = [0, 0.5, 1].map((ratio) => ({
    value: max - ratio * range,
    y: padding + ratio * plotHeight,
  }))

  return {
    points,
    polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
    yTicks,
  }
}

export function formatWeightValue(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} kg`
}
