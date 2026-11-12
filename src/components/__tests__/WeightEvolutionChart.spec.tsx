import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeightEvolutionChart } from '../WeightEvolutionChart'
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

function twoReadings() {
  return [
    record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 12 }),
    record({ id: 'b', createdAt: '2026-03-01T10:00:00.000Z', weightKg: 14.5 }),
  ]
}

describe('WeightEvolutionChart — gráfico de evolução de peso (CLI-04)', () => {
  it('mostra estado vazio sem nenhuma aferição', () => {
    render(<WeightEvolutionChart history={[]} />)

    expect(
      screen.getByText('Nenhuma aferição de peso registrada nos atendimentos deste paciente.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('pede uma segunda aferição quando só existe uma', () => {
    render(<WeightEvolutionChart history={[record()]} />)

    expect(
      screen.getByText('É preciso pelo menos duas aferições para desenhar a curva de evolução.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('explica onde o peso é registrado no estado vazio', () => {
    render(<WeightEvolutionChart history={[]} />)

    expect(
      screen.getByText('O peso é registrado no formulário de atendimento, a cada consulta.')
    ).toBeInTheDocument()
  })

  it('não conta atendimento em andamento como aferição', () => {
    render(
      <WeightEvolutionChart
        history={[
          record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 12 }),
          record({ id: 'b', createdAt: '2026-03-01T10:00:00.000Z', weightKg: 14, finalized: false }),
        ]}
      />
    )

    expect(
      screen.getByText('É preciso pelo menos duas aferições para desenhar a curva de evolução.')
    ).toBeInTheDocument()
  })

  it('desenha a curva com duas aferições', () => {
    render(<WeightEvolutionChart history={twoReadings()} />)

    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('resume quantidade, peso atual e variação', () => {
    render(<WeightEvolutionChart history={twoReadings()} />)

    // O peso atual também aparece na lista textual de aferições, então
    // consultamos o resumo pelo termo correspondente.
    expect(screen.getByText('Aferições').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Atual').nextElementSibling).toHaveTextContent('14,5 kg')
    expect(screen.getByText('Variação').nextElementSibling).toHaveTextContent('+2,5 kg')
  })

  it('marca perda de peso com sinal negativo', () => {
    render(
      <WeightEvolutionChart
        history={[
          record({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z', weightKg: 15 }),
          record({ id: 'b', createdAt: '2026-03-01T10:00:00.000Z', weightKg: 12 }),
        ]}
      />
    )

    expect(screen.getByText('−3,0 kg')).toBeInTheDocument()
  })

  it('descreve a curva no rótulo acessível do SVG', () => {
    render(<WeightEvolutionChart history={twoReadings()} />)

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Curva de peso com 2 aferições, de 12,0 kg em 01/01 a 14,5 kg em 01/03'
    )
  })

  it('lista as aferições em texto, em ordem cronológica', () => {
    render(<WeightEvolutionChart history={twoReadings()} />)

    const items = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(items).toEqual(['01/01/202612,0 kg', '01/03/202614,5 kg'])
  })

  it('mostra data e peso ao passar o mouse sobre um ponto', async () => {
    const user = userEvent.setup()
    render(<WeightEvolutionChart history={twoReadings()} />)

    const hitAreas = document.querySelectorAll('circle[fill="transparent"]')
    expect(hitAreas).toHaveLength(2)

    await user.hover(hitAreas[1])

    expect(screen.getByRole('status')).toHaveTextContent('01/03 — 14,5 kg')
  })
})
