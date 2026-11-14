import { describe, it, expect } from 'vitest'
import {
  formatDateTime,
  formatHospitalizationDuration,
  formatTime,
  getHospitalizationStatusLabel,
  getVitalSignError,
  parseVitalSign,
} from '../hospitalizationFields'

describe('getHospitalizationStatusLabel', () => {
  it('traduz os três status', () => {
    expect(getHospitalizationStatusLabel('ADMITTED')).toBe('Internado')
    expect(getHospitalizationStatusLabel('CRITICAL')).toBe('Crítico')
    expect(getHospitalizationStatusLabel('DISCHARGED')).toBe('Alta concedida')
  })

  it('devolve o valor cru para status desconhecido', () => {
    // Se o backend ganhar um status novo, a tela mostra o código em vez de
    // quebrar ou exibir vazio.
    expect(getHospitalizationStatusLabel('OBSERVATION')).toBe('OBSERVATION')
  })
})

describe('formatHospitalizationDuration', () => {
  const admittedAt = '2026-11-13T08:00:00.000Z'

  it('mostra minutos abaixo de uma hora', () => {
    // "0h" num paciente recém-admitido pareceria erro de cálculo.
    expect(
      formatHospitalizationDuration(admittedAt, null, new Date('2026-11-13T08:40:00.000Z'))
    ).toBe('40min')
  })

  it('mostra horas e minutos no mesmo dia', () => {
    expect(
      formatHospitalizationDuration(admittedAt, null, new Date('2026-11-13T13:30:00.000Z'))
    ).toBe('5h 30min')
  })

  it('omite os minutos quando a hora é exata', () => {
    expect(
      formatHospitalizationDuration(admittedAt, null, new Date('2026-11-13T13:00:00.000Z'))
    ).toBe('5h')
  })

  it('passa a contar em dias depois de 24h', () => {
    expect(
      formatHospitalizationDuration(admittedAt, null, new Date('2026-11-15T12:00:00.000Z'))
    ).toBe('2 dias 4h')
  })

  it('usa singular para um dia', () => {
    expect(
      formatHospitalizationDuration(admittedAt, null, new Date('2026-11-14T08:00:00.000Z'))
    ).toBe('1 dia')
  })

  it('conta até a alta quando ela existe, ignorando o agora', () => {
    expect(
      formatHospitalizationDuration(
        admittedAt,
        '2026-11-13T12:00:00.000Z',
        new Date('2026-11-20T08:00:00.000Z')
      )
    ).toBe('4h')
  })

  it('devolve travessão para data inválida', () => {
    expect(formatHospitalizationDuration('data-quebrada')).toBe('—')
  })

  it('devolve travessão quando a alta é anterior à entrada', () => {
    // Dado inconsistente não deve virar "-5h" na tela.
    expect(formatHospitalizationDuration(admittedAt, '2026-11-12T08:00:00.000Z')).toBe('—')
  })
})

describe('formatDateTime e formatTime', () => {
  it('formata data e hora em pt-BR', () => {
    const formatted = formatDateTime('2026-11-13T15:30:00.000Z')

    expect(formatted).toContain('13/11/2026')
    expect(formatted).toContain('às')
  })

  it('formata só a hora', () => {
    expect(formatTime('2026-11-13T15:30:00.000Z')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('devolve travessão para valor inválido', () => {
    expect(formatDateTime('nao-e-data')).toBe('—')
    expect(formatTime('nao-e-data')).toBe('—')
  })
})

describe('parseVitalSign', () => {
  it('devolve undefined para campo vazio', () => {
    // Sinal vital em branco significa "não aferi", não zero.
    expect(parseVitalSign('')).toBeUndefined()
    expect(parseVitalSign('   ')).toBeUndefined()
  })

  it('aceita vírgula como separador decimal', () => {
    expect(parseVitalSign('38,5')).toBe(38.5)
  })

  it('aceita ponto', () => {
    expect(parseVitalSign('38.5')).toBe(38.5)
  })

  it('devolve null para texto que não é número', () => {
    expect(parseVitalSign('febre')).toBeNull()
  })
})

describe('getVitalSignError', () => {
  it('não acusa erro em campo vazio', () => {
    expect(getVitalSignError('temperature', '')).toBeNull()
    expect(getVitalSignError('heartRate', '')).toBeNull()
  })

  it('aceita valores dentro da faixa', () => {
    expect(getVitalSignError('temperature', '38,5')).toBeNull()
    expect(getVitalSignError('heartRate', '90')).toBeNull()
    expect(getVitalSignError('respiratoryRate', '24')).toBeNull()
  })

  it('acusa texto que não é número', () => {
    expect(getVitalSignError('temperature', 'febre')).toContain('número')
  })

  it('acusa valor fora da faixa', () => {
    expect(getVitalSignError('heartRate', '2000')).toContain('entre 10 e 400')
    expect(getVitalSignError('temperature', '5')).toContain('entre 20 e 50')
  })

  it('exige inteiro em frequência, mas não em temperatura', () => {
    // FC e FR são contagens por minuto; temperatura tem decimal.
    expect(getVitalSignError('heartRate', '90,5')).toContain('inteiro')
    expect(getVitalSignError('temperature', '38,5')).toBeNull()
  })
})
