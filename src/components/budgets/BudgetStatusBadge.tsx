import { BUDGET_STATUS_LABEL, BUDGET_STATUS_STYLE } from '../../lib/budgetStatus'
import type { BudgetStatus } from '../../types'
import '../../styles/budgets.css'

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  const style = BUDGET_STATUS_STYLE[status]

  return (
    <span
      className="budget-status-badge"
      data-testid="budget-status-badge"
      style={{ background: style.background, color: style.color, borderColor: style.border }}
    >
      {BUDGET_STATUS_LABEL[status]}
    </span>
  )
}
