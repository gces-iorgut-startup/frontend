import { useEffect, useState } from 'react'

/**
 * Relógio que avança sozinho, para o tempo de internação não congelar na tela.
 *
 * O plantão deixa o painel aberto por horas: sem isto, "internado há 3h" fica
 * mentindo até alguém recarregar a página. Um minuto de intervalo é suficiente,
 * porque a menor unidade exibida é o minuto.
 *
 * `enabled: false` desliga o timer — serve para a internação com alta, cujo
 * tempo é fixo e não precisa de atualização.
 */
export function useNow(intervalMs = 60_000, enabled = true): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!enabled) return

    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs, enabled])

  return now
}
