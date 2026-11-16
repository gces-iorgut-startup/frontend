const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatCurrency(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0)
}

// Mesmo arredondamento do backend (Math.round(v * 100) / 100), para que a prévia
// no cliente bata com o total gravado.
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
