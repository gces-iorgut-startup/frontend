import type { BudgetStatus } from '../types'

export const BUDGET_STATUS_OPTIONS: { value: BudgetStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'REJECTED', label: 'Recusado' },
  { value: 'EXPIRED', label: 'Expirado' },
]

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  EXPIRED: 'Expirado',
}

// Cores alinhadas às das badges de patologias (ChronicConditionsSection).
export const BUDGET_STATUS_STYLE: Record<BudgetStatus, { background: string; color: string; border: string }> = {
  DRAFT: { background: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  PENDING: { background: '#fef3c7', color: '#b45309', border: '#fde68a' },
  APPROVED: { background: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  REJECTED: { background: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  EXPIRED: { background: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
}

// Espelha a máquina de estados do backend (BUDGET_TRANSITIONS). Ações de UI usam este mapa.
export const BUDGET_TRANSITIONS: Record<BudgetStatus, BudgetStatus[]> = {
  DRAFT: ['PENDING', 'EXPIRED'],
  PENDING: ['APPROVED', 'REJECTED', 'EXPIRED'],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
}

export function isBudgetLocked(status: BudgetStatus): boolean {
  return status === 'APPROVED'
}
