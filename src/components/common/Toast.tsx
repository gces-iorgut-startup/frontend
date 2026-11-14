import { useEffect } from 'react'
import type { ToastState as BudgetToastState } from './useToast'

export type ToastTone = 'success' | 'error'

export interface ToastState {
  tone: ToastTone
  message: string
}

type AnyToastState = ToastState | BudgetToastState

interface ToastProps {
  toast: AnyToastState | null
  onDismiss?: () => void
  /** 0 desliga o fechamento automático. */
  duration?: number
}

function isBudgetToast(toast: AnyToastState): toast is BudgetToastState {
  return 'type' in toast
}

/**
 * Suporta tanto o toast de internação (`tone` + `onDismiss` com classes `.toast-*`)
 * quanto o toast de orçamentos (`type` gerenciado por `useToast`).
 */
export function Toast({ toast, onDismiss, duration = 4000 }: ToastProps) {
  const shouldAutoDismiss = Boolean(toast && !isBudgetToast(toast) && onDismiss && duration > 0)

  useEffect(() => {
    if (!shouldAutoDismiss || !onDismiss) return

    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [toast, shouldAutoDismiss, duration, onDismiss])

  if (!toast) return null

  if (isBudgetToast(toast)) {
    return (
      <div
        className={`budget-toast ${toast.type}`}
        role={toast.type === 'error' ? 'alert' : 'status'}
        data-testid="budget-toast"
      >
        {toast.message}
      </div>
    )
  }

  return (
    <div className="toast-container">
      <div className={`toast toast-${toast.tone}`} role="status">
        {toast.message}
        {onDismiss && (
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
        )}
      </div>
    </div>
  )
}
