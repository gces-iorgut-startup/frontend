// A data de diagnóstico é uma data civil. Ela trafega como 12:00 UTC do dia escolhido,
// o que mantém o mesmo dia em qualquer fuso do Brasil (UTC-5 a UTC-2).

export function getLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function civilDateToIso(civilDate: string): string {
  return new Date(`${civilDate}T12:00:00Z`).toISOString()
}

export function isoToCivilDate(iso?: string | null): string {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export function formatCivilDate(iso?: string | null): string {
  if (!iso) return '—'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}
