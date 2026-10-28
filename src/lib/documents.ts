import { isValidCpf as libValidCpf, isValidCnpj as libValidCnpj } from '@brazilian-utils/brazilian-utils'

/** Mantém apenas dígitos (útil antes de validar ou enviar à API). */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Máscara progressiva de CPF enquanto o usuário digita. */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/** Máscara progressiva de CNPJ enquanto o usuário digita. */
export function maskCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)

  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

/** Máscara progressiva de Telefone (fixo 10 dígitos ou celular 11 dígitos). */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

/** Máscara progressiva de CEP (00000-000). */
export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.replace(/(\d{5})(\d)/, '$1-$2')
}

/** Máscara progressiva de Data BR (dd/mm/aaaa). */
export function maskDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11) return false
  return libValidCpf(d)
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 14) return false
  return libValidCnpj(d)
}
