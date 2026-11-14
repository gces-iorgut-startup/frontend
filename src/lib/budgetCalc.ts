import { roundMoney } from './currency'

export type DiscountType = 'FIXED' | 'PERCENT'

// Linha editável do formulário. Valores ficam como texto para permitir campo vazio.
export interface DraftBudgetItem {
  description: string
  quantity: string
  unitPrice: string
}

export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '') return Number.NaN
  return Number(normalized)
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
    if (!Number.isFinite(quantity) || quantity <= 0) return 'A quantidade deve ser maior que zero.'
    const unitPrice = parseDecimal(item.unitPrice)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return 'O valor unitário não pode ser negativo.'
  }
  return null
}

export function validateDiscount(subtotal: number, type: DiscountType, value: string): string | null {
  if (value.trim() === '') return null
  const parsed = parseDecimal(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 'O desconto não pode ser negativo.'
  if (type === 'PERCENT' && parsed > 100) return 'O desconto percentual não pode passar de 100%.'
  if (type === 'FIXED' && parsed > subtotal) return 'O desconto não pode ser maior que o subtotal dos itens.'
  return null
}
