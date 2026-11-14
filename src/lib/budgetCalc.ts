import { roundMoney } from './currency'

export type DiscountType = 'FIXED' | 'PERCENT'

// Linha editável do formulário. Valores ficam como texto para permitir campo vazio.
export interface DraftBudgetItem {
  description: string
  quantity: string
  unitPrice: string
}

const PT_BR_THOUSANDS_WITH_DECIMAL = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/
const PT_BR_THOUSANDS_ONLY = /^-?\d{1,3}(\.\d{3}){2,}$/
const EN_US_THOUSANDS_WITH_DECIMAL = /^-?\d{1,3}(,\d{3})+\.\d+$/

export function parseDecimal(value: string): number {
  const trimmed = value.trim()
  if (trimmed === '') return Number.NaN

  if (PT_BR_THOUSANDS_WITH_DECIMAL.test(trimmed) || PT_BR_THOUSANDS_ONLY.test(trimmed)) {
    return Number(trimmed.replace(/\./g, '').replace(',', '.'))
  }

  if (EN_US_THOUSANDS_WITH_DECIMAL.test(trimmed)) {
    return Number(trimmed.replace(/,/g, ''))
  }

  return Number(trimmed.replace(',', '.'))
}

export function lineSubtotal(item: DraftBudgetItem): number {
  const quantity = parseDecimal(item.quantity)
  const unitPrice = parseDecimal(item.unitPrice)
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0
  return roundMoney(quantity * unitPrice)
}

export function itemsSubtotal(items: DraftBudgetItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + lineSubtotal(item), 0))
}

// Converte o desconto digitado (R$ ou %) no valor monetário enviado ao backend.
export function discountAmount(subtotal: number, type: DiscountType, value: string): number {
  const parsed = parseDecimal(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return type === 'PERCENT' ? roundMoney((subtotal * parsed) / 100) : roundMoney(parsed)
}

export function totalAmount(subtotal: number, discount: number): number {
  return roundMoney(subtotal - discount)
}

export function validateItems(items: DraftBudgetItem[]): string | null {
  if (items.length === 0) return 'Adicione ao menos um item.'
  for (const item of items) {
    if (item.description.trim() === '') return 'Informe a descrição de cada item.'
    const quantity = parseDecimal(item.quantity)
    if (item.quantity.trim() === '' || !Number.isFinite(quantity)) {
      return 'Informe uma quantidade válida.'
    }
    if (quantity <= 0) return 'A quantidade deve ser maior que zero.'
    if (item.unitPrice.trim() === '') return 'Informe o valor unitário de cada item.'
    const unitPrice = parseDecimal(item.unitPrice)
    if (!Number.isFinite(unitPrice)) return 'Informe um valor unitário válido (ex: 120,50).'
    if (unitPrice < 0) return 'O valor unitário não pode ser negativo.'
  }
  return null
}

export function validateDiscount(subtotal: number, type: DiscountType, value: string): string | null {
  if (value.trim() === '') return null
  const parsed = parseDecimal(value)
  if (!Number.isFinite(parsed)) return 'Informe um desconto válido.'
  if (parsed < 0) return 'O desconto não pode ser negativo.'
  if (type === 'PERCENT' && parsed > 100) return 'O desconto percentual não pode passar de 100%.'
  if (type === 'FIXED' && parsed > subtotal) return 'O desconto não pode ser maior que o subtotal dos itens.'
  return null
}
