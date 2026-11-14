import { useEffect, useId, useRef } from 'react'

export type ConfirmableBudgetStatus = 'APPROVED' | 'REJECTED'

interface ConfirmBudgetStatusDialogProps {
  status: ConfirmableBudgetStatus
  submitting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

const COPY: Record<
  ConfirmableBudgetStatus,
  { title: string; description: string; confirmLabel: string; danger: boolean }
> = {
  APPROVED: {
    title: 'Aprovar este orçamento?',
    description: 'Após a aprovação, o orçamento fica bloqueado para alterações.',
    confirmLabel: 'Confirmar aprovação',
    danger: false,
  },
  REJECTED: {
    title: 'Recusar este orçamento?',
    description: 'A recusa é definitiva e o orçamento não poderá mais ser alterado.',
    confirmLabel: 'Confirmar recusa',
    danger: true,
  },
}

export function ConfirmBudgetStatusDialog({
  status,
  submitting = false,
  onCancel,
  onConfirm,
}: ConfirmBudgetStatusDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  const copy = COPY[status]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }

    return () => {
      if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="budget-confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(event) => {
        event.preventDefault()
        if (!submitting) onCancel()
      }}
    >
      <h3 id={titleId}>{copy.title}</h3>
      <p id={descId}>{copy.description}</p>
      <div className="budget-confirm-actions">
        <button
          type="button"
          className="budget-button ghost"
          onClick={onCancel}
          disabled={submitting}
          autoFocus
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`budget-button ${copy.danger ? 'danger' : 'primary'}`}
          onClick={onConfirm}
          disabled={submitting}
        >
          {copy.confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
