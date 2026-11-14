import { describe, it, expect } from 'vitest'
import {
  discountAmount,
  itemsSubtotal,
  lineSubtotal,
  parseDecimal,
  totalAmount,
  validateDiscount,
  validateItems,
  type DraftBudgetItem,
} from '../budgetCalc'

const item = (overrides: Partial<DraftBudgetItem> = {}): DraftBudgetItem => ({
  description: 'Vacina',
  quantity: '1',
  unitPrice: '10',
  ...overrides,
})

describe('budgetCalc', () => {
  it('aceita vírgula decimal e rejeita campo vazio', () => {
    expect(parseDecimal('19,99')).toBe(19.99)
    expect(parseDecimal('  2.5 ')).toBe(2.5)
    expect(Number.isNaN(parseDecimal(''))).toBe(true)
  })

  it('calcula o subtotal da linha arredondado a 2 casas', () => {
    expect(lineSubtotal(item({ quantity: '3', unitPrice: '19,99' }))).toBe(59.97)
  })

  it('soma os subtotais sem erro de ponto flutuante (0,1 + 0,2 = 0,3)', () => {
    expect(itemsSubtotal([item({ unitPrice: '0,1' }), item({ unitPrice: '0,2' })])).toBe(0.3)
  })

  it('converte desconto percentual em R$ e mantém o fixo como digitado', () => {
    expect(discountAmount(200, 'PERCENT', '12,5')).toBe(25)
    expect(discountAmount(100, 'FIXED', '10,50')).toBe(10.5)
    expect(discountAmount(100, 'FIXED', '')).toBe(0)
  })

  it('total final é subtotal menos desconto', () => {
    expect(totalAmount(60.07, 10.5)).toBe(49.57)
  })

  it('valida itens: lista vazia, descrição, quantidade e valor unitário', () => {
    expect(validateItems([])).toMatch(/ao menos um item/)
    expect(validateItems([item({ description: '   ' })])).toMatch(/descrição/)
    expect(validateItems([item({ quantity: '0' })])).toMatch(/quantidade/)
    expect(validateItems([item({ unitPrice: '-1' })])).toMatch(/negativo/)
    expect(validateItems([item()])).toBeNull()
  })

  it('valida desconto: negativo, acima de 100% e acima do subtotal', () => {
    expect(validateDiscount(100, 'FIXED', '-5')).toMatch(/negativo/)
    expect(validateDiscount(100, 'PERCENT', '101')).toMatch(/100%/)
    expect(validateDiscount(100, 'FIXED', '100,01')).toMatch(/maior que o subtotal/)
    expect(validateDiscount(100, 'FIXED', '100')).toBeNull()
    expect(validateDiscount(100, 'FIXED', '')).toBeNull()
  })
})
