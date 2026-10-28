import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CepNotFoundError, CepRequestError, fetchAddressByCep } from '../cep'

describe('fetchAddressByCep (ViaCEP)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve lançar CepNotFoundError quando o CEP tiver menos de 8 dígitos', async () => {
    await expect(fetchAddressByCep('01001-00')).rejects.toBeInstanceOf(CepNotFoundError)
  })

  it('deve retornar o endereço normalizado quando o ViaCEP responder com sucesso', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cep: '01001-000',
        uf: 'SP',
        localidade: 'São Paulo',
        bairro: 'Sé',
        logradouro: 'Praça da Sé',
      }),
    } as Response)

    const result = await fetchAddressByCep('01001-000')

    expect(result).toEqual({
      cep: '01001000',
      state: 'SP',
      city: 'São Paulo',
      neighborhood: 'Sé',
      street: 'Praça da Sé',
    })
  })

  it('deve lançar CepNotFoundError quando o ViaCEP retornar { erro: true }', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    } as Response)

    await expect(fetchAddressByCep('99999999')).rejects.toBeInstanceOf(CepNotFoundError)
  })

  it('deve lançar CepRequestError quando a resposta HTTP não for ok ou houver falha de rede', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response)

    await expect(fetchAddressByCep('01001000')).rejects.toBeInstanceOf(CepRequestError)

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network down'))
    await expect(fetchAddressByCep('01001000')).rejects.toBeInstanceOf(CepRequestError)
  })
})

