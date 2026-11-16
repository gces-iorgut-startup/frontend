import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useNow } from '../useNow'

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('avança sozinho conforme o intervalo', () => {
    vi.setSystemTime(new Date('2026-11-13T08:00:00.000Z'))
    const { result } = renderHook(() => useNow(60_000))

    const inicial = result.current.getTime()
    expect(result.current.toISOString()).toBe('2026-11-13T08:00:00.000Z')

    // `advanceTimersByTime` move o relógio falso junto, então aferimos o
    // avanço em vez de cravar um horário. `act` para o React processar o
    // setState disparado pelo intervalo.
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current.getTime() - inicial).toBe(60_000)
  })

  it('não avança quando desabilitado', () => {
    // É o caso da internação com alta: o tempo é fixo, não precisa de timer.
    vi.setSystemTime(new Date('2026-11-13T08:00:00.000Z'))
    const { result } = renderHook(() => useNow(60_000, false))

    act(() => {
      vi.advanceTimersByTime(60_000 * 60)
    })

    expect(result.current.toISOString()).toBe('2026-11-13T08:00:00.000Z')
  })

  it('limpa o timer ao desmontar', () => {
    const clearSpy = vi.spyOn(window, 'clearInterval')
    const { unmount } = renderHook(() => useNow(60_000))

    unmount()

    expect(clearSpy).toHaveBeenCalled()
  })
})
