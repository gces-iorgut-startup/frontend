import { useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  formatWeightValue,
  getChartGeometry,
  getWeightSeries,
  type ChartPoint,
} from '../lib/weightEvolution'
import type { ClinicalHistoryItem } from '../types'
import '../styles/weight-chart.css'

interface WeightEvolutionChartProps {
  history: ClinicalHistoryItem[]
}

const WIDTH = 640
const HEIGHT = 240
const PADDING = 36

function formatShortDate(date: Date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * Gráfico de evolução de peso desenhado em SVG, sem biblioteca.
 *
 * Decisão do dia 1 da CLI-04: o projeto não tem nenhuma lib de gráfico, é um
 * gráfico só, e adicionar dependência na sprint final mexeria em lockfile,
 * bundle e build da Vercel sem necessidade.
 */
export function WeightEvolutionChart({ history }: WeightEvolutionChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null)

  const series = useMemo(() => getWeightSeries(history), [history])
  const geometry = useMemo(
    () => getChartGeometry(series.readings, { width: WIDTH, height: HEIGHT, padding: PADDING }),
    [series.readings]
  )

  const { readings } = series

  if (readings.length < 2) {
    return (
      <div className="weight-chart-card">
        <div className="weight-chart-header">
          <TrendingUp size={18} />
          <h3>Evolução de peso</h3>
        </div>
        <p className="weight-chart-empty">
          {readings.length === 0
            ? 'Nenhuma aferição de peso registrada nos atendimentos deste paciente.'
            : 'É preciso pelo menos duas aferições para desenhar a curva de evolução.'}
        </p>
        <p className="weight-chart-empty-hint">
          O peso é registrado no formulário de atendimento, a cada consulta.
        </p>
      </div>
    )
  }

  const first = readings[0]
  const last = readings[readings.length - 1]
  const variationLabel = `${series.variation >= 0 ? '+' : '−'}${formatWeightValue(
    Math.abs(series.variation)
  )}`

  return (
    <div className="weight-chart-card">
      <div className="weight-chart-header">
        <TrendingUp size={18} />
        <h3>Evolução de peso</h3>
      </div>

      <dl className="weight-chart-summary">
        <div>
          <dt>Aferições</dt>
          <dd>{readings.length}</dd>
        </div>
        <div>
          <dt>Atual</dt>
          <dd>{formatWeightValue(last.weightKg)}</dd>
        </div>
        <div>
          <dt>Variação</dt>
          <dd className={series.variation >= 0 ? 'is-up' : 'is-down'}>{variationLabel}</dd>
        </div>
      </dl>

      <svg
        className="weight-chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Curva de peso com ${readings.length} aferições, de ${formatWeightValue(
          first.weightKg
        )} em ${formatShortDate(first.date)} a ${formatWeightValue(last.weightKg)} em ${formatShortDate(last.date)}`}
      >
        {geometry.yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={PADDING}
              x2={WIDTH - PADDING}
              y1={tick.y}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={4} y={tick.y + 4} fontSize={11} fill="#94a3b8">
              {tick.value.toFixed(1).replace('.', ',')}
            </text>
          </g>
        ))}

        <polyline
          points={geometry.polyline}
          fill="none"
          stroke="var(--pink-300, #ec4899)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {geometry.points.map((point) => (
          <g key={point.recordId}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredPoint?.recordId === point.recordId ? 6 : 4}
              fill="#fff"
              stroke="var(--pink-300, #ec4899)"
              strokeWidth={2.5}
            />
            {/* Alvo de interação maior que o ponto visível: 4px de raio é
                pequeno demais para acertar com o mouse ou o dedo. */}
            <circle
              cx={point.x}
              cy={point.y}
              r={14}
              fill="transparent"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          </g>
        ))}

        {geometry.points.map((point, index) => {
          // Com muitas aferições os rótulos se sobrepõem, então mostramos
          // apenas o primeiro, o último e um a cada três no meio.
          const isEdge = index === 0 || index === geometry.points.length - 1
          if (!isEdge && index % 3 !== 0) return null

          return (
            <text
              key={`label-${point.recordId}`}
              x={point.x}
              y={HEIGHT - 10}
              fontSize={11}
              fill="#94a3b8"
              textAnchor={index === 0 ? 'start' : isEdge ? 'end' : 'middle'}
            >
              {formatShortDate(point.date)}
            </text>
          )
        })}
      </svg>

      {hoveredPoint ? (
        <p className="weight-chart-tooltip" role="status">
          {formatShortDate(hoveredPoint.date)} — {formatWeightValue(hoveredPoint.weightKg)}
        </p>
      ) : null}

      <ul className="weight-chart-readings">
        {readings.map((reading) => (
          <li key={reading.recordId}>
            <span>{reading.date.toLocaleDateString('pt-BR')}</span>
            <strong>{formatWeightValue(reading.weightKg)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
