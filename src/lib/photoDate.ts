/**
 * Converte o `YYYY-MM-DD` de um input de data no ISO que o backend espera.
 *
 * O backend recusa `takenAt` no futuro. Um input de data devolve só o dia, e
 * interpretá-lo como meia-noite local pode cair no futuro para quem está em
 * fuso adiantado — quando isso acontece, usamos o instante atual.
 */
export function toTakenAtISO(dateValue: string, now: Date = new Date()): string | undefined {
  if (!dateValue) return undefined

  const parsed = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return undefined

  if (parsed.getTime() > now.getTime()) return now.toISOString()
  return parsed.toISOString()
}
