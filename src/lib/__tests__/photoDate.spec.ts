import { describe, it, expect } from 'vitest'
import { toTakenAtISO } from '../photoDate'

describe('toTakenAtISO', () => {
  it('devolve undefined para valor vazio', () => {
    expect(toTakenAtISO('')).toBeUndefined()
  })

  it('devolve undefined para data inválida', () => {
    expect(toTakenAtISO('não-é-data')).toBeUndefined()
  })

  it('converte uma data passada em ISO', () => {
    const now = new Date('2026-06-01T12:00:00.000Z')
    expect(toTakenAtISO('2026-01-15', now)).toBe(new Date('2026-01-15T00:00:00').toISOString())
  })

  it('usa o instante atual quando a data local cairia no futuro', () => {
    // Protege quem está em fuso adiantado: o backend recusa takenAt futuro.
    const now = new Date('2026-06-01T12:00:00.000Z')
    expect(toTakenAtISO('2027-01-01', now)).toBe(now.toISOString())
  })
})
