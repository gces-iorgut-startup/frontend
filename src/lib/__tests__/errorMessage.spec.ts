import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '../errorMessage'
import { toLocalDateString } from '../localDate'

function httpError(status: number, data: unknown) {
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  } as AxiosResponse)
}

describe('getErrorMessage', () => {
  it('usa a mensagem de domínio devolvida pela API', () => {
    expect(getErrorMessage(httpError(409, { error: 'E-mail já cadastrado' }), 'x')).toBe('E-mail já cadastrado')
  })

  it('oculta detalhes técnicos em erros 5xx', () => {
    expect(getErrorMessage(httpError(500, { error: 'Internal Server Error' }), 'x')).toMatch(/servidor/)
  })

  it('informa falha de conexão quando não há resposta', () => {
    expect(getErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), 'x')).toMatch(/conectar/)
  })
})

describe('toLocalDateString', () => {
  it('usa o dia local, não o UTC', () => {
    expect(toLocalDateString(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12')
  })
})
