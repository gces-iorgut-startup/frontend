import { useCallback, useEffect, useState } from 'react'

export type ToastType = 'success' | 'error'

export interface ToastState {
  id: number
  message: string
  type: ToastType
}

const TOAST_DURATION_MS = 4000

// Feedback temporário. O projeto não tem biblioteca de toast; cada tela mantém o seu.
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ id: Date.now(), message, type })
  }, [])

  return { toast, showToast }
}
