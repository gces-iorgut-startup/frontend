import type { ToastState } from './useToast'

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null

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
