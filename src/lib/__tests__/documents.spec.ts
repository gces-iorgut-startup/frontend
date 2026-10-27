import { describe, expect, it } from 'vitest'
import {
  isValidCnpj,
  isValidCpf,
  maskCep,
  maskCnpj,
  maskCpf,
  maskDate,
  maskPhone,
  onlyDigits,
} from '../documents'

describe('documents utils (Máscaras e Validações)', () => {
  describe('onlyDigits', () => {
    it('deve remover todos os caracteres não numéricos', () => {
      expect(onlyDigits('123.456.789-01')).toBe('12345678901')
      expect(onlyDigits('(11) 98765-4321 abc')).toBe('11987654321')
    })
  })

  describe('maskCpf', () => {
    it('deve formatar progressivamente o CPF e limitar a 11 dígitos', () => {
      expect(maskCpf('123')).toBe('123')
      expect(maskCpf('1234')).toBe('123.4')
      expect(maskCpf('1234567')).toBe('123.456.7')
      expect(maskCpf('12345678901')).toBe('123.456.789-01')
      expect(maskCpf('12345678901999')).toBe('123.456.789-01')
    })
  })

  describe('maskCnpj', () => {
    it('deve formatar progressivamente o CNPJ e limitar a 14 dígitos', () => {
      expect(maskCnpj('12')).toBe('12')
      expect(maskCnpj('12345')).toBe('12.345')
      expect(maskCnpj('12345678')).toBe('12.345.678')
      expect(maskCnpj('123456780001')).toBe('12.345.678/0001')
      expect(maskCnpj('12345678000195')).toBe('12.345.678/0001-95')
      expect(maskCnpj('12345678000195999')).toBe('12.345.678/0001-95')
    })
  })

  describe('maskPhone', () => {
    it('deve aplicar máscara de telefone fixo (10 dígitos) e celular (11 dígitos)', () => {
      expect(maskPhone('1133334444')).toBe('(11) 3333-4444')
      expect(maskPhone('11988887777')).toBe('(11) 98888-7777')
      expect(maskPhone('1198888777799')).toBe('(11) 98888-7777')
    })
  })

  describe('maskCep', () => {
    it('deve aplicar máscara de CEP (00000-000) e limitar a 8 dígitos', () => {
      expect(maskCep('01001')).toBe('01001')
      expect(maskCep('01001000')).toBe('01001-000')
      expect(maskCep('0100100099')).toBe('01001-000')
    })
  })

  describe('maskDate', () => {
    it('deve aplicar máscara de data dd/mm/aaaa e limitar a 8 dígitos', () => {
      expect(maskDate('1508')).toBe('15/08')
      expect(maskDate('15082022')).toBe('15/08/2022')
      expect(maskDate('1508202299')).toBe('15/08/2022')
    })
  })

  describe('isValidCpf & isValidCnpj', () => {
    it('deve validar CPFs reais (com ou sem máscara) e rejeitar CPFs inválidos', () => {
      expect(isValidCpf('52998224725')).toBe(true)
      expect(isValidCpf('529.982.247-25')).toBe(true)
      expect(isValidCpf('111.111.111-11')).toBe(false)
      expect(isValidCpf('123456')).toBe(false)
    })

    it('deve validar CNPJs reais e rejeitar CNPJs inválidos', () => {
      expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
      expect(isValidCnpj('11111111111111')).toBe(false)
      expect(isValidCnpj('123')).toBe(false)
    })
  })
})

