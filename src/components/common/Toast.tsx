import { useEffect } from 'react'

export type ToastTone = 'success' | 'error'

export interface ToastState {
  tone: ToastTone
  message: string
}

interface ToastProps {
  toast: ToastState | null
  onDismiss: () => void
  /** 0 desliga o fechamento automático. */
  duration?: number
}

/**
 * Usa as classes `.toast-*` que já existem em `styles/index.css` — elas
 * estavam declaradas e sem nenhum consumidor.
 *
 * `role="status"` em vez de `alert` para erro de formulário não interromper
 * quem usa leitor de tela no meio do preenchimento.
 */
export function Toast({ toast, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast || duration <= 0) return

    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [toast, duration, onDismiss])

  if (!toast) return null

  return (
    <div className="toast-container">
      <div className={`toast toast-${toast.tone}`} role="status">
        {toast.message}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            marginLeft: 12,
            fontSize: '1rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
